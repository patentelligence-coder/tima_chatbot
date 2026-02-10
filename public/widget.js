(function () {
  const iframe = document.createElement("iframe");

  iframe.src = "http://tima-chatbot.vercel.app/";
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
  `;

  document.body.appendChild(iframe);
})();

