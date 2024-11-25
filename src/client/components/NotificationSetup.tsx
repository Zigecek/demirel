import { Button } from "./Button";

export const NotificationSetup: React.FC<PopupContentProps> = ({ closePopup, showPopup }) => {
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Notification setup</h1>
      <p className="mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac consectetur libero. Nulla facilisi. Nullam nec nunc sit amet nunc tincidunt aliquam. Proin eget turpis eget nunc lacinia tempor.
        Nullam scelerisque, odio non suscipit luctus, mi urna cursus libero, sit amet tincidunt lacus purus et odio. Nulla facilisi. Nullam nec nunc sit amet nunc t
      </p>
      <div className="flex gap-4">
        <Button text="Potvrdit" onClick={closePopup} color="green" />
        <Button text="Zavřít" onClick={closePopup} />
      </div>
    </>
  );
};
