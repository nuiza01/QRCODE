# PM runtime smoke — 2026-08-31

## Scope and candidate

- Authoritative checkout: `/Users/sarawutjuntasang/Nexora/QRCODE`
- Frozen assembled candidate: 121-path digest `046153ef96d98e8fa71e062d33ea8c218a5f34483676b0054f1ad2611e2fdcd6`
- Build lineage: NQR-044 synthetic explicit-origin release artifact; no source/config/package edit, rebuild, deploy or production contact in this smoke.
- Runtime: `next start` on `http://127.0.0.1:3100`, started only after normal localhost permission approval.
- Browser: Codex in-app browser, English route, synthetic URL payload only.

This PM smoke is supporting evidence. Independent NQR-045 QA owns the complete browser/runtime/artifact/accessibility verdict.

## Results

1. `/en` loaded with title `Free QR Code Generator · Nexora QR`; banner, language navigation, main landmark, ten content tabs, labelled controls, preview, quality status, download region and footer were exposed in the browser DOM.
2. Filling `https://example.com/nqr-runtime?case=pm` produced a visible QR preview, enabled Test Scan and PNG/SVG/PDF, and emitted no browser warning/error log.
3. At a temporary 390×844 viewport, document `clientWidth`, body width and `scrollWidth` were all 390 px; no horizontal overflow was observed. The viewport override was reset afterward.
4. Real browser actions saved these files to the user's Downloads directory:
   - `nexora-qr-url-1024.png`: PNG RGBA, 1024×1024, SHA-256 `831d5d9db0a66e1538056c677ccd5dc7ba84ff57029f4bd2ea194ddda6b285af`
   - `nexora-qr-url.svg`: SVG, SHA-256 `d29ddfca61a5b59519870731d4ad77aa416240fe08bca095ba635f69919ce971`
   - `nexora-qr-url-64mm.pdf`: one-page PDF 1.3, SHA-256 `a38eaa417850824b8e5e044180306fe785fd71e2357e3f0199a03928c91bf6f2`
5. XML inspection of the no-logo SVG found zero `image`, `script`, `foreignObject` and href attributes.
6. Apple Vision `VNDetectBarcodesRequest` independently decoded the PNG and rasterized views of the saved SVG and PDF as the exact synthetic URL `https://example.com/nqr-runtime?case=pm`.
7. Test Scan opened a labelled modal with the current QR, placed focus on a Close control, closed on Escape and returned focus to the Test Scan trigger.
8. Thai navigation reached `/th`, set `html[lang="th-TH"]`, retained one main and one footer landmark, exposed all ten Thai content tabs and emitted no warning/error log. A Text payload of 1,200 Thai characters produced localized capacity guidance, disabled PNG and removed Test Scan; replacing it with `ทดสอบ ไทย 😀 é` recovered preview/download eligibility and the Thai quality-pass status.
9. SEC-001 was reproduced on the frozen pre-logo-fix candidate with a synthetic local-only SVG. The selected logo's original `data:image/svg+xml` reached both the UI image and nested QR `<svg><image href=...>` unchanged. PDF export then issued `GET /nqr-logo-probe.png?marker=NQR_PM_SEC001` to a dedicated `127.0.0.1:3101` probe server and showed the fixed generic Thai export failure. No user data or public host was used. This is positive browser evidence that external SVG resources are reachable in the current candidate and justifies independent review/integration of NQR-046; it is not evidence about the unintegrated fix.

Potential accessibility observation routed to independent QA: the modal DOM contains both an `sr-only` DialogTitle and a visible `h2` with the same text, and both a body Close button and top-right icon button share the accessible name `Close`. PM did not classify this as a defect; NQR-045 must independently determine whether duplicate heading/control names create an actionable screen-reader or navigation problem.

## Limits

- Apple Vision is a desktop decoder, not a physical camera, bank app or ECI interoperability matrix.
- This smoke did not complete packet-level traffic, comprehensive logo-format coverage, keyboard/screen-reader coverage, every content type/locale, or production DNS/TLS proof.
- Apart from the explicit synthetic localhost SEC-001 reproduction above, this smoke did not perform a comprehensive browser network capture.
- Browser download event observation timed out even though the three files were saved successfully; file presence, timestamps, types, hashes and independent decode are the evidence used here.
- Production domain, deployment and real PromptPay bank-app UAT still require a concrete user-owned target or action and were not inferred.
