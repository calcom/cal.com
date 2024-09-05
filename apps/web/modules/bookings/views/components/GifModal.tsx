import Image from "next/image";

import addToCalendar from "../../../../public/images/add-to-calendar.gif";

interface GifModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GifModal = ({ visible, onClose }: GifModalProps) => {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      className="absolute flex h-screen w-screen items-center justify-center bg-[rgba(0,0,0,0.4)]"
      style={{ zIndex: 1 }}>
      <div className="m-4 flex max-w-5xl flex-col items-center justify-center gap-4 rounded-lg bg-white p-8">
        <div className="text-center text-xl text-[#012432]">
          <strong>Para adicionar o evento ao seu Google Calendar, </strong>abra o e-mail de confirmação,
          clique no botão "Adicionar à agenda" e, em seguida, toque no botão "Sim", conforme demonstrado
          abaixo:
        </div>
        <Image src={addToCalendar} alt="Adicionar evento ao Google Calendar" />
      </div>
    </div>
  );
};
