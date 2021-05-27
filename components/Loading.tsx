import { useTranslation } from 'next-i18next';

export default function Loading(props) {
    const { t } = useTranslation('common');

    return (
        <div className="loading-box flex flex-col items-center justify-center">
            <p className="text-gray-400">{t('loading')}</p>
        </div>
    );
}