(function () {
  "use strict";

  const SESSION_KEY = "almumez-customer-session";
  const RESET_KEY = "almumez-password-reset";
  const wait = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms));

  // Replace the bodies of these methods with real backend requests when an auth API is available.
  const AuthAPI = {
    async login({ email }) {
      await wait();
      return { user: { name: email.split("@")[0], email } };
    },
    async register({ name, email }) {
      await wait();
      return { user: { name, email } };
    },
    async googleSignIn() {
      await wait();
      return { user: { name: "Google User", email: "google-user@example.com" } };
    },
    async requestPasswordReset({ email }) {
      await wait();
      localStorage.setItem(RESET_KEY, JSON.stringify({ token: "demo-reset-token", email, expiresAt: Date.now() + 60 * 60 * 1000 }));
      return { ok: true };
    },
    async resetPassword({ token }) {
      await wait();
      const request = readResetRequest();
      if (!request || request.token !== token || request.expiresAt < Date.now()) throw new Error("INVALID_TOKEN");
      localStorage.removeItem(RESET_KEY);
      return { ok: true };
    },
  };

  const page = document.body.dataset.authPage;
  const message = document.querySelector("[data-auth-message]");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function readResetRequest() {
    try { return JSON.parse(localStorage.getItem(RESET_KEY) || "null"); }
    catch { return null; }
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, createdAt: Date.now() }));
  }

  function showMessage(text, type = "success") {
    if (!message) return;
    message.hidden = false;
    message.className = `auth-message is-${type}`;
    message.textContent = text;
  }

  function clearMessage() {
    if (!message) return;
    message.hidden = true;
    message.textContent = "";
  }

  function setError(input, text = "") {
    const error = document.querySelector(`[data-error-for="${input.id}"]`);
    input.closest(".auth-input")?.classList.toggle("has-error", Boolean(text));
    if (error) error.textContent = text;
    return !text;
  }

  function validateEmail(input) {
    if (!input.value.trim()) return setError(input, "البريد الإلكتروني مطلوب.");
    if (!emailPattern.test(input.value.trim())) return setError(input, "اكتب بريدًا إلكترونيًا صالحًا.");
    return setError(input);
  }

  function validatePassword(input) {
    if (!input.value) return setError(input, "كلمة المرور مطلوبة.");
    if (input.value.length < 8) return setError(input, "كلمة المرور لازم تكون 8 حروف على الأقل.");
    return setError(input);
  }

  function setLoading(form, loading) {
    const button = form.querySelector('[type="submit"]');
    form.setAttribute("aria-busy", String(loading));
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
  }

  document.querySelectorAll(".auth-password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-label", visible ? "إظهار كلمة المرور" : "إخفاء كلمة المرور");
      button.querySelector(".material-symbols-outlined").textContent = visible ? "visibility" : "visibility_off";
    });
  });

  if (page === "auth") {
    if (localStorage.getItem(SESSION_KEY)) {
      location.replace("index.html");
      return;
    }

    const tabs = document.querySelectorAll("[data-auth-tab]");
    const forms = document.querySelectorAll("[data-auth-form]");
    tabs.forEach((tab) => tab.addEventListener("click", () => {
      clearMessage();
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      forms.forEach((form) => { form.hidden = form.dataset.authForm !== tab.dataset.authTab; });
      document.querySelector(`[data-auth-form="${tab.dataset.authTab}"] input`)?.focus();
    }));

    document.querySelector('[data-auth-form="login"]').addEventListener("submit", async (event) => {
      event.preventDefault(); clearMessage();
      const form = event.currentTarget, email = form.elements.email, password = form.elements.password;
      if (![validateEmail(email), validatePassword(password)].every(Boolean)) return;
      setLoading(form, true);
      try {
        const result = await AuthAPI.login({ email: email.value.trim(), password: password.value });
        setSession(result.user); showMessage("تم تسجيل الدخول بنجاح. جاري تحويلك للمتجر…");
        setTimeout(() => location.replace("index.html"), 700);
      } catch { showMessage("تعذر تسجيل الدخول. حاول مرة أخرى.", "error"); setLoading(form, false); }
    });

    document.querySelector('[data-auth-form="register"]').addEventListener("submit", async (event) => {
      event.preventDefault(); clearMessage();
      const form = event.currentTarget, name = form.elements.name, email = form.elements.email,
        password = form.elements.password, confirm = form.elements.confirmPassword;
      const validName = setError(name, name.value.trim() ? "" : "الاسم مطلوب.");
      const validConfirm = setError(confirm, password.value === confirm.value ? "" : "كلمتا المرور غير متطابقتين.");
      if (![validName, validateEmail(email), validatePassword(password), validConfirm].every(Boolean)) return;
      setLoading(form, true);
      try {
        const result = await AuthAPI.register({ name: name.value.trim(), email: email.value.trim(), password: password.value });
        setSession(result.user); showMessage("تم إنشاء حسابك بنجاح. جاري تحويلك للمتجر…");
        setTimeout(() => location.replace("index.html"), 700);
      } catch { showMessage("تعذر إنشاء الحساب. حاول مرة أخرى.", "error"); setLoading(form, false); }
    });

    document.querySelector("[data-google-auth]").addEventListener("click", async (event) => {
      const button = event.currentTarget; clearMessage(); button.disabled = true; button.classList.add("is-loading");
      try { const result = await AuthAPI.googleSignIn(); setSession(result.user); showMessage("تم تسجيل الدخول بواسطة جوجل."); setTimeout(() => location.replace("index.html"), 700); }
      catch { showMessage("تعذر تسجيل الدخول بواسطة جوجل.", "error"); button.disabled = false; button.classList.remove("is-loading"); }
    });
  }

  if (page === "forgot-password") {
    const form = document.querySelector('[data-auth-form="forgot"]'), resend = document.querySelector("[data-resend]"), count = document.querySelector("[data-resend-count]");
    let lastEmail = "", timer;
    function startCooldown() {
      let remaining = 60; resend.hidden = false; resend.disabled = true;
      count.textContent = `(${remaining})`;
      clearInterval(timer);
      timer = setInterval(() => { remaining -= 1; count.textContent = remaining ? `(${remaining})` : ""; if (!remaining) { clearInterval(timer); resend.disabled = false; } }, 1000);
    }
    async function send(email) {
      setLoading(form, true);
      try { await AuthAPI.requestPasswordReset({ email }); showMessage("لو البريد ده مسجّل عندنا هيوصلك رابط خلال دقايق"); startCooldown(); }
      finally { setLoading(form, false); }
    }
    form.addEventListener("submit", async (event) => { event.preventDefault(); clearMessage(); const email = form.elements.email; if (!validateEmail(email)) return; lastEmail = email.value.trim(); await send(lastEmail); });
    resend.addEventListener("click", async () => { if (!lastEmail || resend.disabled) return; resend.disabled = true; await send(lastEmail); });
  }

  if (page === "reset-password") {
    const form = document.querySelector('[data-auth-form="reset"]'), invalid = document.querySelector("[data-invalid-token]"), token = new URLSearchParams(location.search).get("token"), request = readResetRequest();
    const validToken = Boolean(token && request && request.token === token && request.expiresAt >= Date.now());
    form.hidden = !validToken; invalid.hidden = validToken;
    if (validToken) form.addEventListener("submit", async (event) => {
      event.preventDefault(); clearMessage();
      const password = form.elements.password, confirm = form.elements.confirmPassword;
      const validConfirm = setError(confirm, password.value === confirm.value ? "" : "كلمتا المرور غير متطابقتين.");
      if (![validatePassword(password), validConfirm].every(Boolean)) return;
      setLoading(form, true);
      try { await AuthAPI.resetPassword({ token, password: password.value }); showMessage("تم تحديث كلمة المرور بنجاح. سيتم تحويلك لتسجيل الدخول…"); setTimeout(() => location.replace("auth.html"), 1200); }
      catch { form.hidden = true; invalid.hidden = false; showMessage("الرابط غير صالح أو منتهي.", "error"); }
    });
  }

  window.AlMumezAuthAPI = AuthAPI;
})();
