import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, Button, ButtonGroup } from "@calcom/ui";
import { FiTrash } from "@calcom/ui/components/icon";

type Props = {
  required?: boolean;
  question?: string;
  type?: string;
  editOnClick: () => void;
  deleteOnClick: () => void;
};

function CustomInputItem({ required, deleteOnClick, editOnClick, type, question }: Props) {
  const { t } = useLocale();
  return (
    <li className="flex rounded-b-md border-t border-gray-200 bg-white px-6 py-4 first:rounded-t-md first:border-0">
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="pr-2 text-sm font-semibold leading-none text-black">{question}</span>
          <Badge variant="default" color="gray" withDot={false}>
            {required ? t("required") : t("optional")}
          </Badge>
        </div>
        <p className="text-sm leading-normal text-gray-600">{type}</p>
      </div>
      <ButtonGroup containerProps={{ className: "ml-auto" }}>
        <Button color="secondary" onClick={editOnClick}>
          {t("edit")}
        </Button>
        <Button
          StartIcon={FiTrash}
          variant="icon"
          color="destructive"
          onClick={deleteOnClick}
          className="h-[36px] border border-gray-200"
        />
      </ButtonGroup>
    </li>
  );
}

export default CustomInputItem;
