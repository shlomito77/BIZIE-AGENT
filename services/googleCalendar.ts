
import { Appointment } from '../types';

export class GoogleCalendarService {
  private accessToken: string | null = null;
  private clientId: string = localStorage.getItem('bizie_google_client_id') || "";
  private mode: 'virtual' | 'real' = (localStorage.getItem('bizie_calendar_mode') as 'virtual' | 'real') || 'virtual';

  setClientId(id: string) {
    this.clientId = id;
    localStorage.setItem('bizie_google_client_id', id);
  }

  setMode(mode: 'virtual' | 'real') {
    this.mode = mode;
    localStorage.setItem('bizie_calendar_mode', mode);
  }

  getMode() {
    return this.mode;
  }

  async login(): Promise<{ token: string; email?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.clientId) {
        reject("נא להזין Client ID בהגדרות");
        return;
      }

      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject("ספריית גוגל לא נטענה. בדוק חיבור אינטרנט או חוסם פרסומות.");
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              reject(response.error);
              return;
            }
            this.accessToken = response.access_token;
            
            // Try to get user email for feedback
            let email = undefined;
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                email = userData.email;
              }
            } catch (e) {
              console.warn("Could not fetch user email, but token is valid.");
            }

            resolve({ token: response.access_token, email });
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  async checkAvailability(startTimeISO: string, durationMinutes: number): Promise<boolean> {
    const saved = localStorage.getItem('bizie_virtual_appointments');
    const localApps: Appointment[] = saved ? JSON.parse(saved) : [];
    const start = new Date(startTimeISO).getTime();
    const end = start + durationMinutes * 60000;

    const hasLocalConflict = localApps.some(app => {
      if (app.status === 'cancelled') return false;
      const appStart = new Date(app.startTime).getTime();
      const appEnd = appStart + 60 * 60000;
      return (start < appEnd && end > appStart);
    });

    if (hasLocalConflict) return false;

    if (this.accessToken && this.mode === 'real') {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startTimeISO}&timeMax=${new Date(end).toISOString()}&singleEvents=true`,
          { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        if (response.ok) {
          const data = await response.json();
          return data.items && data.items.length === 0;
        }
      } catch (e) {
        console.warn("Google API check failed, fallback to local.");
      }
    }
    return true;
  }

  async createEvent(event: { summary: string; description: string; start: string; end: string }) {
    if (this.accessToken && this.mode === 'real') {
      try {
        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: event.summary,
              description: event.description,
              start: { dateTime: event.start },
              end: { dateTime: event.end },
            })
          }
        );
        if (res.ok) {
          const data = await res.json();
          return { googleEventId: data.id, status: 'synced' };
        }
      } catch (err) {
        console.error("Failed to sync to Google.");
      }
    }
    return { status: 'local_only' };
  }

  isConnected() {
    return !!this.accessToken;
  }

  disconnect() {
    this.accessToken = null;
  }
}

export const calendarService = new GoogleCalendarService();
