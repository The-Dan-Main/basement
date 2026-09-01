import type { Session, User } from '@supabase/supabase-js';
import type { BasementClient } from '$lib/supabase/client';

declare global {
	namespace App {
		interface Locals {
			supabase: BasementClient | null;
			configured: boolean;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			configured: boolean;
			locale: import('$lib/i18n/locales').Locale;
		}
	}

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

export {};
