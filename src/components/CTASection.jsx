export default function CTASection({ onOpenForm }) {
  return (
    <section className="bg-ink text-bone rounded-xl px-8 py-10 md:py-14 my-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-bone text-3xl md:text-4xl mb-4">
          Bạn vừa thấy 7 chỉ tiêu cơ bản.
        </h2>
        <p className="text-bone/80 text-lg mb-2">
          HAYWEB còn <span className="text-accent">3 chỉ tiêu nâng cao theo chuẩn 2026</span> —
          chưa show ở đây, chỉ chia sẻ qua tư vấn 1-on-1.
        </p>
        <p className="text-bone/60 mb-8">
          Liên hệ để nhận audit miễn phí website hiện tại + lộ trình đạt 10/10.
        </p>

        <button onClick={onOpenForm} className="bg-bone text-ink px-7 py-3.5 rounded-md font-medium text-base hover:bg-accent transition">
          Liên hệ tư vấn miễn phí →
        </button>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-xs text-bone/50">
          <span>✓ Không spam</span>
          <span>✓ Trả lời trong 24h</span>
          <span>✓ Founder Nguyễn Thế Quyền tư vấn trực tiếp</span>
        </div>
      </div>
    </section>
  );
}
