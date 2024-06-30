document.addEventListener('DOMContentLoaded', function () {
    const hearAboutUs = document.getElementById('hear-about-us');
    const webSourceGroup = document.getElementById('web-source-group');
    const socialMediaSiteGroup = document.getElementById('social-media-site-group');

    hearAboutUs.addEventListener('change', function () {
        const value = hearAboutUs.value;
        webSourceGroup.classList.add('hidden');
        socialMediaSiteGroup.classList.add('hidden');

        if (value === 'web') {
            webSourceGroup.classList.remove('hidden');
        } else if (value === 'social-media') {
            socialMediaSiteGroup.classList.remove('hidden');
        }
    });
});
