export default function Disclaimer() {
  return (
    <footer className="border-t border-rule pt-8 pb-12 text-xs text-ink/60 leading-relaxed space-y-3">
      <p>
        Kết quả đo tự động lúc bạn nhấn So sánh. Lighthouse Performance trung bình 3 lần chạy
        mobile (±5-10 điểm là dao động chuẩn). Schema count chỉ đếm số entity @type,
        không liệt kê chi tiết types.
      </p>
      <p>
        <strong className="text-ink/80">Đây là 7 chỉ tiêu kỹ thuật cơ bản</strong> mà mọi website
        chuyên nghiệp nên đạt — HAYWEB framework có thêm <strong className="text-ink/80">3 chỉ
        tiêu nâng cao theo chuẩn 2026</strong> chỉ chia sẻ qua tư vấn 1-on-1.
      </p>
      <p className="text-ink/40">
        Số liệu tại thời điểm đo, không guarantee ranking SEO. Cập nhật cadence: tiêu chí HIGH
        30-60 ngày / MEDIUM 90-180 ngày / LOW annual.
      </p>
      <p className="text-ink/40">
        Nội dung được hỗ trợ bởi AI (tỷ lệ &lt;10%) · review bởi Nguyễn Thế Quyền · audit trail
        per Thông tư 18/2027 lưu 3 năm.
      </p>
    </footer>
  );
}
