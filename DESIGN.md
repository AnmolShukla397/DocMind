# DocMind visual system — Source Gallery

DocMind is a private research studio where answers stay attached to their source passages. The new public experience treats a group of documents as a physical exhibit in a dark room. One continuous canvas changes composition as the visitor scrolls from the opening statement to a live question demonstration and then the research method. The site has its own editorial character and does not borrow HireFlow's visual language.

## Visual grammar

| Role | Color |
| --- | --- |
| Gallery graphite | `#090e0d` |
| Forest shadow | `#11231b` |
| Mineral green | `#bdeacb` |
| Paper | `#eff2ec` |
| Deep ink | `#17392c` |

Bodoni Moda Variable gives the public story a deliberate editorial voice. Jost Variable carries navigation, controls, and the research studio. Paper surfaces in the app provide a calm contrast with the gallery introduction. The account page and workbench use the same materials and type.

## Behavior

- The public story keeps a single WebGL canvas mounted while the source exhibit moves through three positions. Scroll updates the object pose and atmospheric light, not the canvas size. Pointer movement adds a restrained camera-like response; dragging rotates the exhibit; selecting a source brings another record to the front.
- The question demonstration connects a selectable prompt, a concise finding, and the supporting passage. The process tabs and four-tool preview each change content without page navigation. The preview has a bounded perspective response to pointer movement.
- The four-tool preview keeps one content layer mounted and uses a stable card height. Fast pointer moves never leave an empty frame or move the closing section.
- Buttons, tabs, and links use distinct pressed, hover, and focus treatments. A contextual cursor appears only for fine pointers. Mobile layouts put the source and copy in a readable vertical composition.
- The final section pairs a source-record composition and a page-turn entry action with three concrete data and evidence notes. Privacy, Terms, and Accessibility pages remain available without an account.
- The render loop pauses when the tab is hidden or the exhibit is out of view. Reduced-motion preference keeps a still 3D composition while preserving all controls. Text and actions remain accessible DOM elements outside the canvas.

The web visual system is in `web/src/experience.css`; the 3D source exhibit is in `web/src/Scene.tsx`. Existing document ingestion, retrieval, authentication, and the original Streamlit workflow remain available.
