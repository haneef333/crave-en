"""
End-to-end check of the whole order flow:
storefront API (Express, :5000)  <->  Smart Inventory API (FastAPI, :8010)

Run both servers locally (with the same INTEGRATION_SECRET), seed the storefront
(npm run seed), then:

    python scripts/e2e_flow.py

Uses only the Python standard library. Creates a throwaway customer account and a
few orders, accepts / declines / cancels them and checks stock was deducted correctly.
Run it against local development data only: it changes inventory quantities.
"""
import datetime, json, sys, time, urllib.error, urllib.parse, urllib.request

import os

STORE = os.getenv("STORE_API", "http://127.0.0.1:5000/api")
INV = os.getenv("INVENTORY_API", "http://127.0.0.1:8010/api")
OWNER_PASSWORD = os.getenv("OWNER_PASSWORD", "")  # set this if the inventory app has a login
results = []
OWNER_TOKEN = None


def call(method, url, body=None, token=None, headers=None):
    h = {"content-type": "application/json"}
    if token is None and url.startswith(INV) and OWNER_TOKEN:
        token = OWNER_TOKEN
    if token:
        h["authorization"] = f"Bearer {token}"
    h.update(headers or {})
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))


def wait_for(fn, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(0.5)
    return None


def stock():
    _, inv = call("GET", f"{INV}/inventory")
    return {i["item_name"]: i["quantity"] for i in inv}


def recipe(name):
    _, rows = call("GET", f"{INV}/recipes/{urllib.parse.quote(name)}")
    return {r["ingredient_name"]: r["quantity_needed"] for r in rows}



# --- owner logs in to the inventory app (when it has a login)
s, st = call("GET", f"{INV}/auth/status")
if st and st.get("auth_required"):
    if not OWNER_PASSWORD:
        sys.exit("The inventory app has a login. Run with OWNER_PASSWORD=... set.")
    s, bad = call("GET", f"{INV}/inventory", token="")
    check("inventory app refuses requests without login", s == 401)
    s, login_res = call("POST", f"{INV}/auth/login", {"password": OWNER_PASSWORD}, token="")
    check("owner logs in to inventory app", s == 200)
    OWNER_TOKEN = login_res["token"]

# --- a fresh customer signs up and logs in
EMAIL = f"e2e-{int(time.time())}@example.com"
s, _ = call("POST", f"{STORE}/auth/register", {"name": "E2E Customer", "email": EMAIL, "password": "secret12", "phone": "9876543210"})
check("customer registers", s == 201)
s, login = call("POST", f"{STORE}/auth/login", {"email": EMAIL, "password": "secret12"})
check("customer login", s == 200)
tok = login["token"]
s, bad = call("POST", f"{STORE}/auth/login", {"email": EMAIL, "password": "wrong"})
check("wrong password rejected", s == 401)

_, products = call("GET", f"{STORE}/products")
by_recipe = {p["recipeName"]: p for p in products}
brownie, cookies, cake = by_recipe["Brownie"], by_recipe["Cookies"], by_recipe["Cake"]

_, meta = call("GET", f"{STORE}/meta")
today = meta["today"]
tomorrow = (datetime.date.fromisoformat(today) + datetime.timedelta(days=1)).isoformat()
today_slot = next((x["id"] for x in meta["slots"]["today"] if x["available"]), None)
# Orders for "today" only work while a slot is still open; otherwise use tomorrow
same_day = today if today_slot else tomorrow
same_day_slot = today_slot or "morning"

s, av = call("GET", f"{STORE}/products/availability")
check("availability proxied from inventory", s == 200 and av["online"] and av["byRecipe"].get("Brownie", 0) > 0, av)

# --- notice period enforced
CAKE_OPTIONS = {"size": "2 kg", "flavour": "Chocolate", "eggless": True, "occasion": "Birthday", "message": "Happy Birthday Sana", "candles": 5}
order_body = {
    "items": [{"productId": brownie["_id"], "quantity": 3}, {"productId": cookies["_id"], "quantity": 2},
              {"productId": cake["_id"], "quantity": 1, "options": CAKE_OPTIONS}, {"productId": brownie["_id"], "quantity": 1}],
    "phone": "9876543210", "fulfilment": "delivery", "address": "12 MG Road, Hosapete, Karnataka",
    "neededBy": today, "timeSlot": "evening", "notes": "Please ring the bell twice", "paymentMethod": "upi",
}
s, err = call("POST", f"{STORE}/orders", order_body, tok)
check("cake needs 1 day notice", s == 400 and "notice" in err["message"], err)

order_body["neededBy"] = tomorrow
s, order = call("POST", f"{STORE}/orders", order_body, tok)
check("order placed", s == 201, order)
num = order["orderNumber"]
check("duplicate lines merged (brownie x4)", any(i["recipeName"] == "Brownie" and i["quantity"] == 4 for i in order["items"]))
size = next(x for x in cake["sizes"] if x["label"] == "2 kg")
flavour = next(x for x in cake["flavours"] if x["label"] == "Chocolate")
cake_price = size["price"] + flavour["extra"] + cake["egglessExtra"]
expected_total = 4 * brownie["price"] + 2 * cookies["price"] + cake_price + meta["deliveryFee"]
check("total computed on server incl. delivery fee", order["total"] == expected_total, f'{order["total"]} vs {expected_total}')
check("status awaiting_confirmation", order["status"] == "awaiting_confirmation")

# --- arrives in inventory app
def find_new():
    _, lst = call("GET", f"{INV}/online-orders?status=new")
    return next((o for o in lst if o["external_id"] == num), None)
inv_order = wait_for(find_new)
check("order received by inventory app", inv_order is not None)
check("stock check says can fulfil", inv_order and inv_order["stock_check"]["can_fulfil"], inv_order and inv_order.get("stock_check"))
check("payment method mapped upi->online", inv_order and inv_order["payment_method"] == "online")
cake_item = inv_order and next((i for i in inv_order["items"] if i["product_name"] == "Cake"), None)
check("cake arrives with size, scale and celebration details",
      cake_item and cake_item["recipe_scale"] == 2 and "2 kg" in cake_item["display_name"] and "Happy Birthday Sana" in (cake_item["details"] or ""), cake_item)
check("time slot arrives in inventory app", inv_order and inv_order["time_slot"].startswith("Evening"), inv_order and inv_order.get("time_slot"))
_, summ = call("GET", f"{INV}/online-orders/summary")
check("summary counts new order", summ["new"] >= 1)

s, so = call("GET", f"{STORE}/orders/{num}", token=tok)
check("storefront marks sync sent", so["inventorySync"]["state"] == "sent", so["inventorySync"])

# --- owner accepts: stock deducted by recipe
before = stock()
need = {}
for rname, qty in (("Brownie", 4), ("Cookies", 2), ("Cake", 1 * 2)):  # 2 kg cake = 2 x recipe
    for ing, q in recipe(rname).items():
        need[ing] = need.get(ing, 0) + q * qty
s, acc = call("POST", f"{INV}/online-orders/{inv_order['id']}/accept")
check("owner accepts", s == 200, acc)
after = stock()
ok = all(abs((before[i] - after[i]) - q) < 1e-6 for i, q in need.items())
check("ingredients deducted per recipe, scaled by cake size", ok, {i: (before[i] - after[i], q) for i, q in need.items()})
untouched = [i for i in before if i not in need and before[i] != after[i]]
check("other ingredients untouched", not untouched, untouched)
_, inv_orders = call("GET", f"{INV}/orders")
linked = [o for o in inv_orders if o.get("online_order_id") == inv_order["id"]]
check("3 rows written to orders table (dashboard)", len(linked) == 3, len(linked))

s, dbl = call("POST", f"{INV}/online-orders/{inv_order['id']}/accept")
check("double accept refused, no second deduction", s == 409 and stock() == after, dbl)

st = wait_for(lambda: call("GET", f"{STORE}/orders/{num}", token=tok)[1]["status"] == "accepted")
check("customer sees 'accepted'", st)

for status in ("baking", "ready"):
    call("PATCH", f"{INV}/online-orders/{inv_order['id']}/status", {"status": status})
    check(f"customer sees '{status}'", wait_for(lambda: call("GET", f"{STORE}/orders/{num}", token=tok)[1]["status"] == status))
s, bad = call("PATCH", f"{INV}/online-orders/{inv_order['id']}/status", {"status": "baking"})
check("backwards status change refused", s == 409)
call("PATCH", f"{INV}/online-orders/{inv_order['id']}/status", {"status": "completed", "payment_status": "paid"})
final = wait_for(lambda: (lambda o: o if o["status"] == "completed" and o["paymentStatus"] == "paid" else None)(call("GET", f"{STORE}/orders/{num}", token=tok)[1]))
check("customer sees completed + paid", final)
_, inv_orders = call("GET", f"{INV}/orders")
check("orders rows marked delivered/paid", all(o["delivery_status"] == "delivered" and o["payment_status"] == "paid" for o in inv_orders if o.get("online_order_id") == inv_order["id"]))
check("timeline has 5 events", final and [e["status"] for e in final["statusHistory"]] == ["awaiting_confirmation", "accepted", "baking", "ready", "completed"], final and final["statusHistory"])

# --- decline path
simple = {"items": [{"productId": brownie["_id"], "quantity": 2}], "phone": "9876543210", "neededBy": same_day, "timeSlot": same_day_slot, "paymentMethod": "cash"}
_, o2 = call("POST", f"{STORE}/orders", simple, tok)
inv2 = wait_for(lambda: next((o for o in call("GET", f"{INV}/online-orders?status=new")[1] if o["external_id"] == o2["orderNumber"]), None))
before = stock()
s, _ = call("POST", f"{INV}/online-orders/{inv2['id']}/decline", {"reason": "Fully booked today, sorry"})
check("owner declines", s == 200)
d = wait_for(lambda: (lambda o: o if o["status"] == "declined" else None)(call("GET", f"{STORE}/orders/{o2['orderNumber']}", token=tok)[1]))
check("customer sees decline reason", d and d["declineReason"] == "Fully booked today, sorry", d and d.get("declineReason"))
check("decline does not touch stock", stock() == before)

# --- customer cancel path
_, o3 = call("POST", f"{STORE}/orders", simple, tok)
inv3 = wait_for(lambda: next((o for o in call("GET", f"{INV}/online-orders?status=new")[1] if o["external_id"] == o3["orderNumber"]), None))
s, c = call("POST", f"{STORE}/orders/{o3['orderNumber']}/cancel", token=tok)
check("customer cancels before acceptance", s == 200 and c["status"] == "cancelled", c)
_, done = call("GET", f"{INV}/online-orders?status=done")
check("inventory shows it cancelled", any(o["external_id"] == o3["orderNumber"] and o["status"] == "cancelled" for o in done))
s, _ = call("POST", f"{INV}/online-orders/{inv3['id']}/accept")
check("cancelled order cannot be accepted", s == 409)
s, c2 = call("POST", f"{STORE}/orders/{num}/cancel", token=tok)
check("cannot cancel after acceptance", s == 409)

# --- shortage path
big = {"items": [{"productId": cake["_id"], "quantity": 50, "options": {"size": "2 kg", "flavour": "Vanilla"}},
                 {"productId": by_recipe["Victorian Sponge"]["_id"], "quantity": 50, "options": {"size": "1.5 kg"}}],
       "phone": "9876543210", "neededBy": tomorrow, "timeSlot": "morning"}
_, o4 = call("POST", f"{STORE}/orders", big, tok)
inv4 = wait_for(lambda: next((o for o in call("GET", f"{INV}/online-orders?status=new")[1] if o["external_id"] == o4["orderNumber"]), None))
check("stock check flags shortage before accepting", inv4 and not inv4["stock_check"]["can_fulfil"], inv4 and inv4["stock_check"])
before = stock()
s, sh = call("POST", f"{INV}/online-orders/{inv4['id']}/accept")
check("accept refused with shortage list", s == 409 and isinstance(sh["detail"], list) and any("Not enough" in x for x in sh["detail"]), sh)
check("nothing deducted on refusal", stock() == before)
_, still = call("GET", f"{INV}/online-orders?status=new")
check("order still 'new' after refused accept", any(o["id"] == inv4["id"] for o in still))
call("POST", f"{INV}/online-orders/{inv4['id']}/decline", {"reason": "Not enough butter for 100 cakes"})

# --- security
s, _ = call("POST", f"{STORE}/integrations/inventory/order-status", {"external_id": num, "status": "declined"})
check("storefront webhook rejects missing secret", s == 401)
s, _ = call("POST", f"{INV}/online-orders", {"external_id": "X"}, headers={"x-integration-secret": "nope"})
check("inventory rejects wrong secret", s == 401)
s, _ = call("GET", f"{STORE}/orders/{num}")
check("orders need login", s == 401)
_, reg = call("POST", f"{STORE}/auth/register", {"name": "Other", "email": f"other{int(time.time())}@x.com", "password": "secret12"})
s, _ = call("GET", f"{STORE}/orders/{num}", token=reg["token"])
check("other customers cannot see my order", s == 403)
s, _ = call("POST", f"{STORE}/products", {"name": "Hack", "recipeName": "Brownie", "category": "Cakes", "price": 1}, reg["token"])
check("customers cannot edit menu", s == 403)
tampered = {"items": [{"productId": brownie["_id"], "quantity": 1, "price": 1, "unitPrice": 1}], "phone": "9876543210", "neededBy": same_day, "timeSlot": same_day_slot, "total": 1}
_, o5 = call("POST", f"{STORE}/orders", tampered, tok)
check("browser-sent prices ignored", o5["total"] == brownie["price"], o5.get("total"))

# --- coupons: discount checked on the server and shared fairly in the inventory app's sales
fresh_email = f"coupon-{int(time.time())}@example.com"
_, reg2 = call("POST", f"{STORE}/auth/register", {"name": "Coupon Customer", "email": fresh_email, "password": "secret12", "phone": "9876543210"})
tok2 = reg2["token"]
s, preview = call("POST", f"{STORE}/coupons/validate", {"code": "first10", "subtotal": 1000}, tok2)
check("FIRST10 previews 10% (max 100)", s == 200 and preview["discount"] == 100, preview)
s, small = call("POST", f"{STORE}/coupons/validate", {"code": "FIRST10", "subtotal": 100}, tok2)
check("coupon minimum order enforced", s == 400 and "at least" in small["message"], small)
s, o6 = call("POST", f"{STORE}/orders", {**simple, "items": [{"productId": cookies["_id"], "quantity": 5}], "couponCode": "FIRST10"}, tok2)
check("order with coupon", s == 201 and o6["discount"] == min(round(5 * cookies["price"] * 0.1), 100) and o6["total"] == 5 * cookies["price"] - o6["discount"], o6)
s, again = call("POST", f"{STORE}/coupons/validate", {"code": "FIRST10", "subtotal": 1000}, tok2)
check("first-order coupon can't be reused", s == 400, again)
inv6 = wait_for(lambda: next((o for o in call("GET", f"{INV}/online-orders?status=new")[1] if o["external_id"] == o6["orderNumber"]), None))
check("discount arrives in inventory app", inv6 and inv6["discount"] == o6["discount"] and inv6["coupon_code"] == "FIRST10", inv6 and (inv6.get("discount"), inv6.get("coupon_code")))
s, acc6 = call("POST", f"{INV}/online-orders/{inv6['id']}/accept")
check("accepted revenue is after the discount", s == 200 and abs(acc6["revenue"] - (5 * cookies["price"] - o6["discount"])) < 0.01, acc6.get("revenue") if isinstance(acc6, dict) else acc6)

# --- reviews: only after the order is completed
s, early = call("POST", f"{STORE}/reviews", {"productId": cookies["_id"], "rating": 5, "comment": "Yum"}, tok2)
check("can't review before receiving the order", s == 403, early)
for st in ("baking", "ready", "completed"):
    call("PATCH", f"{INV}/online-orders/{inv6['id']}/status", {"status": st})
wait_for(lambda: call("GET", f"{STORE}/orders/{o6['orderNumber']}", token=tok2)[1]["status"] == "completed")
s, rv = call("POST", f"{STORE}/reviews", {"productId": cookies["_id"], "rating": 4, "comment": "Crisp and chewy"}, tok2)
check("review after completed order", s == 201 and rv["rating"] == 4, rv)
s, rv2 = call("POST", f"{STORE}/reviews", {"productId": cookies["_id"], "rating": 5, "comment": "Even better second time"}, tok2)
_, plist = call("GET", f"{STORE}/products")
cookie_now = next(p for p in plist if p["_id"] == cookies["_id"])
_, revs = call("GET", f"{STORE}/products/{cookies['_id']}/reviews")
mine = [r for r in revs if r["user"] == rv2["user"]]  # this customer's reviews only
check("reviewing again updates instead of duplicating", s == 201 and len(mine) == 1 and mine[0]["comment"].startswith("Even better"), mine)
check("product rating updated", cookie_now["ratingCount"] >= 1 and cookie_now["ratingAvg"] > 0, (cookie_now["ratingAvg"], cookie_now["ratingCount"]))

# --- forgot / reset password (the email is printed by the server when SMTP isn't set)
s, fg = call("POST", f"{STORE}/auth/forgot", {"email": "nobody-here@example.com"})
check("forgot password doesn't reveal unknown emails", s == 200)
s, _ = call("POST", f"{STORE}/auth/reset", {"token": "not-a-real-token", "password": "newpass12"})
check("bad reset token refused", s == 400)

# --- Google sign-in reports clearly when it isn't configured
s, g = call("POST", f"{STORE}/auth/google", {"credential": "x"})
check("Google sign-in answers 503 when not set up (or 401 for a bad credential)", s in (503, 401), (s, g))

passed = sum(1 for _, ok in results if ok)
print(f"\n{passed}/{len(results)} checks passed")
sys.exit(0 if passed == len(results) else 1)
