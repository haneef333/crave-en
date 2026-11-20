// A photograph in a fixed frame. If the bakery hasn't added this photo yet,
// the fallback (usually a drawn bake) fills the frame so nothing is ever empty.
export default function Photo({ src, alt, className = '', eager = false, fallback = null, children, ...rest }) {
  return (
    <figure className={className} {...rest}>
      {src
        ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
        : fallback}
      {children}
    </figure>
  )
}
