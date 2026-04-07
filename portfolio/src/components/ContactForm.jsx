import { useState } from 'react';

// ─── Formspree Endpoint ──────────────────────────────────────
// 본인 폼으로 바꾸려면 https://formspree.io 가입 후 발급받은 ID로 교체
// ─────────────────────────────────────────────────────────────
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mlgoznad';

export default function ContactForm() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const form = e.target;
    const data = new FormData(form);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        const json = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMsg(json.error || '전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('네트워크 오류: ' + err.message);
    }
  };

  return (
    <section className="section contact" id="contact">
      <div className="contact__inner">
        <h2 className="section__title">Contact</h2>
        <p className="section__subtitle">메시지를 보내주세요. 빠르게 답변드리겠습니다.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form__field">
            <label htmlFor="name">이름</label>
            <input id="name" name="name" type="text" required placeholder="홍길동" />
          </div>

          <div className="form__field">
            <label htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>

          <div className="form__field">
            <label htmlFor="message">메시지</label>
            <textarea id="message" name="message" required placeholder="안녕하세요, ..." />
          </div>

          {status === 'success' && (
            <div className="form__status form__status--success">
              ✓ 메시지가 전송되었습니다. 감사합니다!
            </div>
          )}
          {status === 'error' && (
            <div className="form__status form__status--error">
              ✗ {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn--primary form__submit" disabled={status === 'sending'}>
            {status === 'sending' ? '전송 중...' : '메시지 보내기'}
          </button>
        </form>
      </div>
    </section>
  );
}
