import { useState, useEffect } from "react"

export const VersionPicker = () => {
  // State to hold the current selection
  const [version, setVersion] = useState('V1');

  // Effect hook to load the selection from local storage on component mount
  useEffect(() => {
    const storedVersion = localStorage.getItem('selectedAPIVersion');
    if (storedVersion) {
      setVersion(storedVersion);
    }
  }, []);

  // Effect hook to update local storage whenever the selection changes
  useEffect(() => {
    localStorage.setItem('selectedAPIVersion', version);
  }, [version]);

  // Handler for when a new selection is made
  const handleChange = (event) => {
    setVersion(event.target.value);
  };

  return (
    <div>
      <select className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" value={version} onChange={handleChange}>
        <option value="V1">API v1</option>
        <option value="V2">API v2</option>
      </select>
    </div>
  );
};

<VersionPicker />
