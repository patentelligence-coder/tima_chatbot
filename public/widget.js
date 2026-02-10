(function () {
  if (window.__TIMA_WIDGET_LOADED__) return;
  window.__TIMA_WIDGET_LOADED__ = true;

  const container = document.getElementById("tima-chatbot");
  if (!container) return;

  const iframe = document.createElement("iframe");
  iframe.src = "https://tima-chatbot.vercel.app";

  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
  `;

  container.appendChild(iframe);
})();
