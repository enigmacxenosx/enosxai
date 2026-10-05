# Windows installer branding and SmartScreen

## Branding

The Tauri bundle uses the official ENOSX AI glass `EX` logo from the identity system. The generated assets are stored in `desktop-shell/src-tauri/icons/` and include:

- `icon.ico` with 16, 24, 32, 48, 64, 128, and 256 px Windows icon frames
- PNG assets for the Tauri application and installer bundle sizes

The icon is configured in `desktop-shell/src-tauri/tauri.conf.json`, so new NSIS and MSI builds use the ENOSX logo for the application and setup package.

## Why SmartScreen still says “Unknown publisher”

The message is not caused by the icon. Windows displays **Unknown publisher** when the executable is not signed with a trusted Authenticode code-signing certificate. An icon only changes the visual branding; it cannot establish publisher identity or SmartScreen reputation.

To remove the publisher warning in production, the Windows release workflow must sign the generated `.exe` and `.msi` with a certificate issued to the legal publisher name (for example, `Enosx Technologies`) and timestamp the signature with a trusted RFC 3161 timestamp service. The certificate/private key should be stored as protected CI secrets, never committed to this repository.

After signing, SmartScreen reputation may still require initial downloads and time to build. Users can verify the signature from **Properties → Digital Signatures**.

## Release checklist

1. Configure a Windows Authenticode certificate for the publisher identity.
2. Import/use it only in the protected Windows CI runner.
3. Sign both the NSIS `.exe` and MSI artifacts before publishing the release.
4. Add a trusted timestamp to each signature.
5. Publish from the organization’s stable release identity; changing certificates or publisher names can restart SmartScreen reputation.
