// Runs before every test file. Uses a separate database so tests never touch
// your real data, and turns off calls to the inventory app.
process.env.NODE_ENV = 'test'
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/bakery_test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.INTEGRATION_SECRET = 'test-integration-secret'
process.env.INVENTORY_SYNC = 'off'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.CLOUDINARY_URL = ''
process.env.SMTP_HOST = ''
process.env.UPLOAD_DIR = `${(await import('node:os')).tmpdir()}/bakery-test-uploads`
