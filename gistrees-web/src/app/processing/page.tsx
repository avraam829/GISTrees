export default function ProcessingPage() {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "grid",
      placeItems: "center",
    }}>
      <div
        style={{
          width: 720,
          maxWidth: "90%",
          minHeight: 360,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
          border: "1px solid #e5e7eb",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Обработка</h1>
          <p style={{ opacity: .8 }}>Тут появится пайплайн/статусы. Пока — заготовка.</p>
        </div>
      </div>
    </div>
  );
}
