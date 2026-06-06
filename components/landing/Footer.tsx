export function Footer() {
  return (
    <footer className="relative py-12 border-t border-white/10" style={{ backgroundColor: '#001a36' }}>
      <div className="container max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-center md:text-left">
        <div>
          <span className="font-rustic text-white text-2xl block mb-2 tracking-tight">Sea of Blue</span>
          <p className="text-white/40">Private beta cleaning network.</p>
        </div>
        <div className="text-white/40">
          <p>Ontario, Canada.</p>
          <p>&copy; {new Date().getFullYear()} Sea of Blue. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
