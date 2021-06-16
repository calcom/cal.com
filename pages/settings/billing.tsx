import Head from 'next/head';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';

export default function Billing() {
    return(
        <Shell heading="Billing">
            <Head>
                <title>Billing | Calendso</title>
            </Head>
            <SettingsShell>
                <div className="py-6 px-4 sm:p-6 lg:pb-8 lg:col-span-9">
                    <div className="mb-6">
                        <h2 className="text-lg leading-6 font-medium text-gray-900">Change your Subscription</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Cancel, update credit card or change plan
                        </p>
                    </div>
                    <div className="my-6">
                        <iframe src="https://calendso.com/subscription-embed" style={{width: "100%", border: 0}} />
                    </div>
                </div>
            </SettingsShell>
        </Shell>
    );
}