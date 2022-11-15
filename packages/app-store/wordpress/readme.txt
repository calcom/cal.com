=== Cal.com ===
Contributors: calcom, turn2honey
Tags: calendar, booking, appointment, calcom
Requires at least: 4.0
Tested up to: 6.0.1
Stable tag: 1.0.0
Requires PHP: 5.2.4
License: GNU General Public License
License URI: https://www.gnu.org/licenses/gpl-3.0.en.html

Embed Cal.com booking calendar in WordPress.

== Description ==

Cal.com is the open source Calendly alternative that lets you easily book appointments and schedule meetings, without the email tennis.

== Features ==

- Add Cal.com booking calendar to any WordPress page/post with a simple shortcode.
- Display your Cal.com booking calendar inline or in a popup.
- Customize your booking button to suit you.

== Installation ==

1. Install the plugin via WordPress dashboard / or download the ZIP achieve from WordPress repository
2. Paste the embed shortcode in a page or post.

== Shortcode ==

[cal url=/username/meetingid]

== Shortcode Customization == 

[cal url=/username/meetingid type=2 text="Schedule a call with me"]

**url:** URL of the booking calendar
**type**: Add inline or popup embed. Inline embed: 1, Popup embed: 2
**text:** For popup embed, customize the text/button that triggers the popup.
 
== CSS Customization == 

To customize the popup text/button, style the **#calcom-embed-link** element with CSS. 

Example: 

`
#calcom-embed-link {
	background-color: #222222;
	padding: 15px;
	color: #fff;
	font-size: 16px;
	text-align: center;
    cursor: pointer;
}
`

== Use of  3rd Party Software ==

This plugin relies on [Cal.com embed](https://cal.com). See their [Privacy Policy](https://cal.com/privacy) and [Terms of use](https://cal.com/terms).
