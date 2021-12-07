import AppCard from "./AppCard";

export default function Slider() {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">All apps</h2>
      <div className="grid grid-cols-3 gap-3">
        <AppCard
          name="Zoom"
          description="Zoom provides video conferencing services."
          logo="https://st3.zoom.us/static/5.2.3509/image/thumb.png"
          rating={4.8}
        />
        <AppCard
          name="Zoom"
          description="Zoom provides video conferencing services."
          logo="https://st3.zoom.us/static/5.2.3509/image/thumb.png"
          rating={4.8}
        />
        <AppCard
          name="Zoom"
          description="Zoom provides video conferencing services."
          logo="https://st3.zoom.us/static/5.2.3509/image/thumb.png"
          rating={4.8}
        />
      </div>
    </div>
  );
}
