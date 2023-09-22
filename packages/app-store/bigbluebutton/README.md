# Setting up the BigBlueButton Integration

This assumes you are self-hosting or have full access to a BBB server.

Please see the official bare-metal self-hosting docs [here](https://docs.bigbluebutton.org/administration/install). You can also use [Ansible](https://docs.bigbluebutton.org/administration/install#ansible) and [Docker](https://github.com/bigbluebutton/docker#install) to help you get set up!

## Get the connection details from your server

1. Run the following command on the server:
```
bbb-conf --secret
```
2. The output should look something like this:
```env
# this is the API endpoint
URL: https://example.com/bigbluebutton/
# this is your secret
Secret: 39F3ZJG3DQGQTL2Y6BY3AEPLWJNZJCCE
```
3. If you have modified your BBB config, please check the [supportedChecksumAlgorithms](https://docs.bigbluebutton.org/administration/customize/#other-meeting-configs-available:~:text=supportedChecksumAlgorithms) key:
```env
# a comma-separated list of hash algorithms
supportedChecksumAlgorithms=sha384,sha512
```
4. Take note of the *highest* supported hash algorithm.

## Set up the integration on Cal.com

1. Navigate to the conferencing section of the App Store.
2. Select BigBlueButton and click the install button.
3. Enter your details from above on the setup page.

## Using the integration

1. Enable the integration for an event or set as default for all.
2. Both, attendees and you, will be sent a join link.
3. Attendees will be simple "viewers".
4. You and your team members will automatically become "moderators".
