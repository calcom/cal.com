import { googleCalendarAtomClassnamesPropData, availabilitySettingsAtomClassnamesPropData, bookerAtomPropsClassnamesPropData } from "@utils/atomsClassnameTableData";
import { Atoms } from "@utils/atomsPropTableData";

export default ({
    atom
  }: {
    atom: string;
  }) => {
  let tableData = [{name: '', description: ''}];

  if (atom === Atoms.Gcal) { 
    tableData = googleCalendarAtomClassnamesPropData
  }

  if (atom === Atoms.Availability) {
    tableData = availabilitySettingsAtomClassnamesPropData
  }

  if (atom === Atoms.Booker) {
    tableData = bookerAtomPropsClassnamesPropData
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
                <td className="border-[0.5px] py-1 px-2 border-black">Classname</td>
                <td className="border-[0.5px] py-1 px-2 border-black">Description</td>
            </tr>
            {
              tableData.map((prop) => {
                return (
                  <tr key={prop.name} className="border-[0.5px] border-black">
                    <td className="border-[0.5px] py-1 px-2 border-black font-semibold">{prop.name}</td>
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
  