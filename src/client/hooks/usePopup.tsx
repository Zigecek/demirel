import { useState } from "react";
import ReactDOM from "react-dom";

type PopupHookReturnType = {
  PopupComponent: React.ReactPortal | null;
  showPopup: () => void;
  closePopup: () => void;
  isVisible: boolean;
};

export const usePopup = (PopupContent: React.FC<PopupContentProps>): PopupHookReturnType => {
  const [isVisible, setIsVisible] = useState(false);

  const showPopup = () => setIsVisible(true);
  const closePopup = () => setIsVisible(false);

  const PopupComponent = isVisible
    ? ReactDOM.createPortal(
        <div className="fixed inset-0 bg-neutral-600 bg-opacity-75 flex items-center justify-center z-50 sm:p-9">
          <div className="bg-white dark:bg-neutral-800 p-3 sm:rounded-lg shadow-lg relative w-full h-full">
            <PopupContent showPopup={showPopup} closePopup={closePopup} />
          </div>
        </div>,
        document.body
      )
    : null;

  return { PopupComponent, showPopup, closePopup, isVisible };
};
