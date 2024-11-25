import { useState } from "react";
import ReactDOM from "react-dom";

type PopupHookReturnType = {
  PopupComponent: React.ReactPortal | null;
  showPopup: () => void;
  closePopup: () => void;
};

export const usePopup = (PopupContent: React.FC<PopupContentProps>): PopupHookReturnType => {
  const [isVisible, setIsVisible] = useState(false);

  const showPopup = () => setIsVisible(true);
  const closePopup = () => setIsVisible(false);

  const PopupComponent = isVisible
    ? ReactDOM.createPortal(
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg relative max-w-3xl w-full">
            <PopupContent showPopup={showPopup} closePopup={closePopup} />
          </div>
        </div>,
        document.body
      )
    : null;

  return { PopupComponent, showPopup, closePopup };
};
