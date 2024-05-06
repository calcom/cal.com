import { bookerAtomPropsData, availabilitySettingsAtomPropsData, googleCalendarAtomPropsData } from "@utils/atomsPropTableData";
import { Atoms } from "@utils/atomsPropTableData";

export default ({
    atom
  }: {
    atom: string;
  }) => {
  let tableData = [{name: '', required: false, description: ''}];

  if (atom === Atoms.Gcal) { 
    tableData = googleCalendarAtomPropsData
  }

  if (atom === Atoms.Availability) {
    tableData = availabilitySettingsAtomPropsData
  }

  if (atom === Atoms.Booker) {
    tableData = bookerAtomPropsData
  }

  if(atom === "") {
    return <></>
  }

    return (
      <
      >
        <table className="mt-8">
          <tbody>
            <tr className="border-[0.5px] border-black font-semibold">
                <td className="border-[0.5px] py-1 px-2 border-black">Paramater</td>
                <td className="border-[0.5px] py-1 px-2 border-black">Required</td>
                <td className="border-[0.5px] py-1 px-2 border-black">Description</td>
            </tr>
            {
              tableData.map((prop) => {
                return (
                  <tr key={prop.name} className="border-[0.5px] border-black">
                    <td className="border-[0.5px] py-1 px-2 border-black font-semibold">{prop.name}</td>
                    <td className="border-[0.5px] py-1 px-2 border-black">{prop.required ? 'Yes': 'No'}</td>
                    <td className="border-[0.5px] py-1 px-2 border-black">{prop.description}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </>
    );
  };
  