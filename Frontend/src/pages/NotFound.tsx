import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center text-center px-6 bg-white">
      {/* Title */}
      <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
        Sorry!
      </h1>

      {/* Subtitle */}
      <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-xs mb-6">
        We couldn't find your page.<br />
        But we're working on it.<br />
        Honest.
      </p>

      {/* Link */}
      <Link
        to="/Login"
        className="text-amber-600 hover:text-amber-500 font-bold text-sm sm:text-base tracking-wide transition-colors underline underline-offset-4 decoration-2 decoration-amber-500/50 hover:decoration-amber-400 mb-8"
      >
        Go to the front page
      </Link>

      {/* Polar Bear */}
      <img
        src={`${import.meta.env.BASE_URL}images/polar_bear_404.png`}
        alt="404 Polar Bear"
        className="max-w-[320px] sm:max-w-[400px] w-full object-contain"
      />
    </div>
  );
}
