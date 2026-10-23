# Separate task: complete QuickCart product links in the web frontend

This is a handoff for the separate Vercel frontend repository. The mobile
workspace contains no web source, so do not apply these changes to the mobile
app as a substitute for editing the correct frontend repository.

## Verified deployment observations

- Production origin supplied for QuickCart: `https://quick-cart-indol-rho-13.vercel.app`
- `/products/<id>` currently returns the generic Vite `index.html` with title
  `QuickCart` and generic Open Graph description.
- `/.well-known/assetlinks.json` and
  `/.well-known/apple-app-site-association` currently return the same HTML
  fallback document, not association files.
- Backend origin configured by the mobile client:
  `https://quickcart-bxod.onrender.com/api`

## Required frontend changes

1. Inspect `client/api/product-meta.js`. Implement crawler-readable product
   metadata for `/products/:id`, using the existing backend product endpoint.
   Emit the product name, a short description, the best available product image,
   and canonical URL
   `https://quick-cart-indol-rho-13.vercel.app/products/<id>`. Handle missing
   products and missing descriptions/images without leaking customer data or
   authentication credentials.
2. Inspect `client/vercel.json`. Preserve the existing SPA route while ensuring
   the metadata handler and both `/.well-known/*` documents bypass the SPA
   fallback. Confirm the metadata response contains product-specific OG tags for
   crawler requests and the ordinary product page still loads in a browser.
3. Set `SITE_URL=https://quick-cart-indol-rho-13.vercel.app` in
   `client/.env.example`. Keep `VITE_API_URL` and
   `PRODUCT_API_BASE_URL` aligned with the existing deployment configuration;
   do not put secrets in Vite variables.
4. Add a public `assetlinks.json` under the frontend's `.well-known` directory.
   Android package ID is verified as `com.quickcartmobile`. Use the production
   Play App Signing SHA-256 fingerprint when supplied. Do not use the debug
   fingerprint for the production association.
5. Add a public `apple-app-site-association` under the frontend's `.well-known`
   directory, with `/products/*` rules. The production Apple Team ID and bundle
   ID are still needed; use no guessed identifier.
6. Verify the deployed association URLs return their JSON documents directly,
   with no redirect or SPA HTML fallback. Confirm the AASA content type and
   Android JSON content type, and test with actual signed Android/iOS builds.

## Values still required

- Production Play App Signing SHA-256 fingerprint. The mobile Gradle project
  currently points its release variant to the debug keystore; this must not be
  treated as the Play production signing certificate.
- Apple Team ID and production iOS bundle ID. The current Xcode bundle ID is a
  React Native template value.
