import type { Locale } from '$lib/i18n/locales';

const en = {
	language: 'Language',
	nav: {
		lists: 'Lists',
		household: 'Household',
		settings: 'Settings',
		signOut: 'Sign out',
		logIn: 'Log in',
		getStarted: 'Get started'
	},
	landing: {
		title: 'Basement — household lists that leave the house',
		kicker: 'From fridge to aisle',
		heading: 'Write it in the basement.',
		headingBreak: 'Check it off at the store.',
		body: 'Shared shopping lists for the house. Dark, installable, and stubborn about staying useful when you are underground or in the freezer aisle.',
		start: 'Start a household list',
		haveAccount: 'I already have an account',
		previewKicker: 'Tonight’s run',
		previewLeft: '3 left',
		previewFoot: 'Alex just checked oat milk.',
		preview: [
			{ name: 'Oat milk', note: 'Barista', done: true },
			{ name: 'Tomatoes', note: '6', done: false },
			{ name: 'Dish soap', note: '', done: false },
			{ name: 'Sourdough', note: 'if they have it', done: false }
		],
		steps: [
			{
				title: 'Write it downstairs',
				body: 'Dump the week onto a list before anyone leaves the house.'
			},
			{
				title: 'Take it to the aisle',
				body: 'Install it. The list stays on the phone when the signal does not.'
			},
			{
				title: 'Tick it together',
				body: 'When someone grabs the milk, it clears for everyone else too.'
			}
		],
		features: [
			{
				title: 'Works in the cellar',
				body: 'No bars, no problem. Add and check items offline; they sync when you come back up.'
			},
			{
				title: 'One carton, two thumbs',
				body: 'Invite the household. Live check-off means you do not buy a second bottle of the same thing.'
			},
			{
				title: 'It already knows oat milk',
				body: 'Type three letters and last week’s staples surface. Quantity and a note if you need them.'
			}
		]
	},
	setup: {
		kicker: 'Setup',
		title: 'Connect Supabase',
		body: 'Create a new Supabase project, paste the URL and publishable key into .env, then run this SQL in the editor.',
		copy: 'Copy SQL',
		copied: 'Copied',
		dashboard: 'Open dashboard'
	},
	auth: {
		welcome: 'Welcome back',
		welcomeBody: 'Sign in to your household lists.',
		email: 'Email',
		password: 'Password',
		logIn: 'Log in',
		signingIn: 'Signing in…',
		magic: 'Email me a link',
		newHere: 'New here?',
		createAccount: 'Create an account',
		signupTitle: 'Create an account',
		signupBody: 'Start a household and your first shopping list.',
		displayName: 'Display name',
		create: 'Create account',
		creating: 'Creating…',
		already: 'Already have an account?'
	},
	errors: {
		notConfigured: 'Supabase is not configured yet.',
		enterPassword: 'Enter your password, or use a magic link.',
		enterEmail: 'Enter an email first.',
		checkInbox: 'Check your inbox for a sign-in link.',
		minPassword: 'Use at least 6 characters.',
		checkEmail: 'Check your email to confirm the account, then log in.',
		signInFirst: 'Sign in first.',
		nameRequired: 'Enter a name.',
		ownerOnly: 'Only the owner can invite.',
		inviteCreated: 'Invite created.',
		inviteRemoved: 'Invite removed.',
		inviteUsed: 'This invite was already used.',
		inviteExpired: 'This invite has expired.',
		inviteNotFound: 'Invite not found.',
		inviteEmail: 'Sign in with the invited email address.',
		generic: 'Something went wrong'
	},
	lists: {
		title: 'Lists · Basement',
		hi: 'Hi {name}',
		heading: 'Shopping lists',
		placeholder: 'New list name',
		add: 'Add list',
		adding: 'Adding…',
		emptyTitle: 'No lists yet',
		emptyBody: 'Add Groceries or Hardware and start ticking things off.',
		left: '{unchecked} left · {total} items'
	},
	list: {
		title: '{name} · Basement',
		missing: 'This list is gone.',
		all: 'All lists',
		save: 'Save',
		rename: 'Rename',
		delete: 'Delete',
		deleteConfirm: 'Delete {name}?',
		empty: 'Nothing left to pick up.',
		hideChecked: 'Hide {count} checked',
		showChecked: 'Show {count} checked'
	},
	items: {
		placeholder: 'Add milk, eggs…',
		qty: 'Qty',
		note: 'Note',
		add: 'Add',
		save: 'Save',
		cancel: 'Cancel',
		edit: 'Edit',
		delete: 'Delete',
		check: 'Check {name}',
		uncheck: 'Uncheck {name}'
	},
	household: {
		title: 'Household · Basement',
		kicker: 'Share lists with people in your house',
		heading: 'Household',
		missing: 'No household yet. Open this page online once to create one.',
		name: 'Name',
		save: 'Save',
		members: 'Members',
		owner: 'Owner',
		member: 'Member',
		invite: 'Invite someone',
		inviteHelp: 'They must sign in with this email to join.',
		invitePlaceholder: 'partner@email.com',
		createInvite: 'Create invite',
		copy: 'Copy link',
		copied: 'Copied',
		revoke: 'Revoke'
	},
	settings: {
		title: 'Settings · Basement',
		heading: 'Settings',
		body: 'Language follows this device. Signed-in accounts keep it across browsers.',
		language: 'Language',
		languageHelp: 'English and German for now. The rest of the house can pick their own.',
		displayName: 'Display name',
		displayNameHelp: 'This is how household members see you.',
		save: 'Save',
		saving: 'Saving…',
		saved: 'Saved.'
	},
	invite: {
		title: 'Join household',
		used: 'This invite was already used.',
		open: 'Open lists',
		mismatch: 'This invite is for {email}. Sign in with that address to join.',
		invited: 'You are invited to {name}.',
		join: 'Join household'
	},
	install: {
		title: 'Install Basement',
		ios: 'Open the share sheet and tap Add to Home Screen.',
		other: 'Add it to your home screen for one-tap lists in the store.',
		iosHelp: 'Use the Safari share button, then Add to Home Screen.',
		install: 'Install',
		later: 'Later',
		dismiss: 'Dismiss'
	},
	offline: {
		away: 'You are offline. Changes will sync later.',
		synced: 'Lists are back in sync.'
	},
	errorPage: {
		offline: 'Offline',
		offlineBody: 'This page is not on the device yet. Open it once while online.',
		backLists: 'Back to lists',
		backHome: 'Back home'
	}
};

const de: typeof en = {
	language: 'Sprache',
	nav: {
		lists: 'Listen',
		household: 'Haushalt',
		settings: 'Einstellungen',
		signOut: 'Abmelden',
		logIn: 'Anmelden',
		getStarted: 'Loslegen'
	},
	landing: {
		title: 'Basement — Haushaltslisten, die mitkommen',
		kicker: 'Vom Kühlschrank ins Regal',
		heading: 'Unten aufschreiben.',
		headingBreak: 'Im Laden abhaken.',
		body: 'Gemeinsame Einkaufslisten fürs Haus. Dunkel, installierbar, und hartnäckig nützlich — im Keller oder in der Tiefkühlabteilung.',
		start: 'Haushaltsliste starten',
		haveAccount: 'Ich habe schon ein Konto',
		previewKicker: 'Heutiger Gang',
		previewLeft: '3 übrig',
		previewFoot: 'Alex hat gerade Hafermilch abgehakt.',
		preview: [
			{ name: 'Hafermilch', note: 'Barista', done: true },
			{ name: 'Tomaten', note: '6', done: false },
			{ name: 'Spülmittel', note: '', done: false },
			{ name: 'Sauerteigbrot', note: 'falls sie welches haben', done: false }
		],
		steps: [
			{
				title: 'Unten notieren',
				body: 'Die Woche auf eine Liste, bevor jemand das Haus verlässt.'
			},
			{
				title: 'Mit ins Regal',
				body: 'Installieren. Die Liste bleibt auf dem Handy, auch ohne Empfang.'
			},
			{
				title: 'Gemeinsam abhaken',
				body: 'Wer die Milch nimmt, löscht sie für alle anderen mit.'
			}
		],
		features: [
			{
				title: 'Geht auch im Keller',
				body: 'Kein Empfang, kein Problem. Offline hinzufügen und abhaken — Sync, wenn du wieder oben bist.'
			},
			{
				title: 'Eine Packung, zwei Daumen',
				body: 'Den Haushalt einladen. Live-Abhaken heißt: niemand kauft die zweite Flasche.'
			},
			{
				title: 'Kennt schon Hafermilch',
				body: 'Drei Buchstaben, und die Staples von letzter Woche tauchen auf. Menge und Notiz, wenn nötig.'
			}
		]
	},
	setup: {
		kicker: 'Einrichtung',
		title: 'Supabase verbinden',
		body: 'Neues Supabase-Projekt anlegen, URL und Publishable Key in .env eintragen, dann dieses SQL im Editor ausführen.',
		copy: 'SQL kopieren',
		copied: 'Kopiert',
		dashboard: 'Dashboard öffnen'
	},
	auth: {
		welcome: 'Willkommen zurück',
		welcomeBody: 'Melde dich bei den Haushaltslisten an.',
		email: 'E-Mail',
		password: 'Passwort',
		logIn: 'Anmelden',
		signingIn: 'Anmeldung…',
		magic: 'Link per E-Mail',
		newHere: 'Neu hier?',
		createAccount: 'Konto erstellen',
		signupTitle: 'Konto erstellen',
		signupBody: 'Starte einen Haushalt und die erste Einkaufsliste.',
		displayName: 'Anzeigename',
		create: 'Konto erstellen',
		creating: 'Wird erstellt…',
		already: 'Schon ein Konto?'
	},
	errors: {
		notConfigured: 'Supabase ist noch nicht eingerichtet.',
		enterPassword: 'Passwort eingeben oder den Magic Link nutzen.',
		enterEmail: 'Zuerst eine E-Mail eingeben.',
		checkInbox: 'Schau im Posteingang nach dem Anmeldelink.',
		minPassword: 'Mindestens 6 Zeichen.',
		checkEmail: 'E-Mail bestätigen, dann anmelden.',
		signInFirst: 'Zuerst anmelden.',
		nameRequired: 'Einen Namen eingeben.',
		ownerOnly: 'Nur die Besitzerin oder der Besitzer kann einladen.',
		inviteCreated: 'Einladung erstellt.',
		inviteRemoved: 'Einladung entfernt.',
		inviteUsed: 'Diese Einladung wurde schon genutzt.',
		inviteExpired: 'Diese Einladung ist abgelaufen.',
		inviteNotFound: 'Einladung nicht gefunden.',
		inviteEmail: 'Mit der eingeladenen E-Mail-Adresse anmelden.',
		generic: 'Etwas ist schiefgelaufen'
	},
	lists: {
		title: 'Listen · Basement',
		hi: 'Hi {name}',
		heading: 'Einkaufslisten',
		placeholder: 'Neuer Listenname',
		add: 'Liste anlegen',
		adding: 'Wird angelegt…',
		emptyTitle: 'Noch keine Listen',
		emptyBody: 'Lege Lebensmittel oder Baumarkt an und hak ab.',
		left: '{unchecked} übrig · {total} Artikel'
	},
	list: {
		title: '{name} · Basement',
		missing: 'Diese Liste ist weg.',
		all: 'Alle Listen',
		save: 'Speichern',
		rename: 'Umbenennen',
		delete: 'Löschen',
		deleteConfirm: '{name} löschen?',
		empty: 'Nichts mehr einzupacken.',
		hideChecked: '{count} Erledigte ausblenden',
		showChecked: '{count} Erledigte anzeigen'
	},
	items: {
		placeholder: 'Milch, Eier…',
		qty: 'Menge',
		note: 'Notiz',
		add: 'Hinzufügen',
		save: 'Speichern',
		cancel: 'Abbrechen',
		edit: 'Bearbeiten',
		delete: 'Löschen',
		check: '{name} abhaken',
		uncheck: '{name} zurücksetzen'
	},
	household: {
		title: 'Haushalt · Basement',
		kicker: 'Listen mit Leuten im Haus teilen',
		heading: 'Haushalt',
		missing: 'Noch kein Haushalt. Öffne diese Seite einmal online, dann wird einer angelegt.',
		name: 'Name',
		save: 'Speichern',
		members: 'Mitglieder',
		owner: 'Besitzer',
		member: 'Mitglied',
		invite: 'Jemanden einladen',
		inviteHelp: 'Zum Beitreten muss diese E-Mail verwendet werden.',
		invitePlaceholder: 'partner@email.com',
		createInvite: 'Einladung erstellen',
		copy: 'Link kopieren',
		copied: 'Kopiert',
		revoke: 'Zurückziehen'
	},
	settings: {
		title: 'Einstellungen · Basement',
		heading: 'Einstellungen',
		body: 'Die Sprache gilt für dieses Gerät. Mit Konto bleibt sie über Browser hinweg.',
		language: 'Sprache',
		languageHelp: 'Vorläufig Englisch und Deutsch. Jede Person im Haushalt kann selbst wählen.',
		displayName: 'Anzeigename',
		displayNameHelp: 'So sehen dich die anderen im Haushalt.',
		save: 'Speichern',
		saving: 'Speichern…',
		saved: 'Gespeichert.'
	},
	invite: {
		title: 'Haushalt beitreten',
		used: 'Diese Einladung wurde schon genutzt.',
		open: 'Listen öffnen',
		mismatch: 'Diese Einladung gilt für {email}. Melde dich mit dieser Adresse an.',
		invited: 'Du bist zu {name} eingeladen.',
		join: 'Haushalt beitreten'
	},
	install: {
		title: 'Basement installieren',
		ios: 'Teilen-Menü öffnen und „Zum Home-Bildschirm“ tippen.',
		other: 'Auf den Home-Bildschirm, dann eine Tippen im Laden.',
		iosHelp: 'In Safari teilen, dann Zum Home-Bildschirm.',
		install: 'Installieren',
		later: 'Später',
		dismiss: 'Schließen'
	},
	offline: {
		away: 'Du bist offline. Änderungen kommen später nach.',
		synced: 'Listen sind wieder synchron.'
	},
	errorPage: {
		offline: 'Offline',
		offlineBody: 'Diese Seite liegt noch nicht auf dem Gerät. Einmal online öffnen.',
		backLists: 'Zurück zu den Listen',
		backHome: 'Zurück zur Startseite'
	}
};

export type Messages = typeof en;

export const messages: Record<Locale, Messages> = { en, de };
