import { useState } from "react";
import { GlobeIcon } from '@heroicons/react/outline';
import { useTranslation } from 'next-i18next';
import { LANGUAGES, RTL_LANGUAGES } from '../config';

export default function ChangeLanguage(props) {
    const [ languageDropdownExpanded, setLanguageDropdownExpanded ] = useState(false);
    const { i18n } = useTranslation();
    const locale = i18n.language;
    const toggleLanguageDropdown = () => {
        setLanguageDropdownExpanded(!languageDropdownExpanded);
    }

    const changeLanguage = (lang) => {
        i18n.changeLanguage(lang);
        toggleLanguageDropdown();
    }

    return (
        <div>
            <div className="ml-4 flex items-center md:ml-6">
                <div className="ml-3 relative">
                    <div>
                        <button onClick={toggleLanguageDropdown} type="button" className="max-w-xs bg-gray-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white" id="user-menu" aria-expanded="false" aria-haspopup="true">
                            <span className="sr-only">Open user menu</span>
                            <GlobeIcon className="block h-6 w-6 text-white" />
                        </button>
                    </div>
                    {
                        languageDropdownExpanded && (
                            <div className={(RTL_LANGUAGES.includes(locale) ? 'left-0' : 'right-0') + " origin-top-right absolute mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"} role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                                {
                                    LANGUAGES.map(
                                        (lang) => <button key={lang.value} onClick={() => changeLanguage(lang.value)} className="w-full text-start block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">{lang.title}</button>
                                    )
                                }
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}