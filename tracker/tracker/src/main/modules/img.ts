import type App from "../app/index.js";
import { timestamp, isURL } from "../utils.js";
import { ResourceTiming, SetNodeAttributeURLBased, SetNodeAttribute } from "../../common/messages.js";
import { hasTag } from "../app/guards.js";



const PLACEHOLDER_SRC = "https://static.openreplay.com/tracker/placeholder.jpeg";

export default function (app: App): void {
  function sendPlaceholder(id: number, node: HTMLImageElement): void {
    app.send(new SetNodeAttribute(id, "src", PLACEHOLDER_SRC))
    const { width, height } = node.getBoundingClientRect();
    if (!node.hasAttribute("width")){
      app.send(new SetNodeAttribute(id, "width", String(width)))
    }
    if (!node.hasAttribute("height")){
      app.send(new SetNodeAttribute(id, "height", String(height)))
    }
  }

  const sendImgSrc = app.safe(function (this: HTMLImageElement): void {
    const id = app.nodes.getID(this);
    if (id === undefined) {
      return;
    }
    const { src, complete, naturalWidth, naturalHeight, srcset } = this;
    if (!complete) {
      return;
    }
    if (naturalWidth === 0 && naturalHeight === 0) {
      if (src != null && isURL(src)) { // TODO: How about relative urls ? Src type is null sometimes.
        app.send(new ResourceTiming(timestamp(), 0, 0, 0, 0, 0, src, 'img'));
      }
    } else if (src.length >= 1e5 || app.sanitizer.isMasked(id)) {
      sendPlaceholder(id, this)
    } else {
      app.send(new SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()));
      srcset && app.send(new SetNodeAttribute(id, 'srcset', srcset));
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        const target = (mutation.target as HTMLImageElement);
        const id = app.nodes.getID(target);
        if (id === undefined) {
          return;
        }
        if (mutation.attributeName === "src") {
          const src = target.src;
          app.send(new SetNodeAttributeURLBased(id, 'src', src, app.getBaseHref()));
        }
        if (mutation.attributeName === "srcset") {
          const srcset = target.srcset;
          app.send(new SetNodeAttribute(id, 'srcset', srcset));
        }
      }
    }
  });

  app.nodes.attachNodeCallback((node: Node): void => {
    if (!hasTag(node, "IMG")) {
      return;
    }
    app.nodes.attachElementListener('error', node, sendImgSrc);
    app.nodes.attachElementListener('load', node, sendImgSrc);
    sendImgSrc.call(node);
    observer.observe(node, { attributes: true, attributeFilter: [ "src", "srcset" ] });
  });
}
