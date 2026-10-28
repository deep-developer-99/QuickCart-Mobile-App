# Mobile typography

App-owned React Native text uses `AppText` and `AppTextInput` from
`src/components/AppText.tsx`. Their shared font names live in
`src/theme/globalFont.ts`, and named text styles live in
`src/theme/typography.ts`.

`AppText` and `AppTextInput` preserve caller styles and props. If a style sets a
font weight but no font family, the component selects the matching bundled
Regular, Medium, SemiBold, or Bold face. An explicitly supplied font family is
left alone. Weights below 500 use Regular because the project does not include
a Light face.

System-owned surfaces such as `Alert.alert`, the on-screen keyboard, and native
payment or authentication SDK screens keep their platform typography. They are
not React Native text nodes that this app can style reliably. SVG illustrations
and icon glyphs also keep their own artwork or glyph rendering.
