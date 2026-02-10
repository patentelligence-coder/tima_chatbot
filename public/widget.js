(function () {
  const iframe = document.createElement("iframe");

  iframe.src = "https://tima-chatbot.vercel.app/";
  iframe.style.cssText = `
    bottom: 20px;
    right: 20px;
    width: 380px;
    height: 520px;
    border: none;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 9999;
  `;

  document.body.appendChild(iframe);
})();
