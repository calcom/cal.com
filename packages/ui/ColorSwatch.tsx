type Props = {
  color: string;
  value: number;
};

function ColorSwatch({ color, value, hex }: { color: string; value: number; hex: string }) {
  return <div className={`h-8 w-full`} style={{ backgroundColor: hex }}></div>;
}

export default ColorSwatch;
