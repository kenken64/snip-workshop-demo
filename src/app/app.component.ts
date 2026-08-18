import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinkService, SnipLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly title = 'Snip';
  readonly url = signal('');
  readonly links = signal<SnipLink[]>([]);
  readonly createdLink = signal<SnipLink | null>(null);
  readonly error = signal('');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  private readonly linkService = inject(LinkService);

  ngOnInit(): void {
    this.loadLinks();
  }

  submit(): void {
    const url = this.url().trim();
    this.error.set('');
    this.createdLink.set(null);

    if (!this.isHttpUrl(url)) {
      this.error.set('Enter a valid http:// or https:// URL.');
      return;
    }

    this.isSubmitting.set(true);
    this.linkService.createLink(url).subscribe({
      next: (link) => {
        this.createdLink.set(link);
        this.url.set('');
        this.isSubmitting.set(false);
        this.loadLinks();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error, 'Could not shorten that URL.'));
        this.isSubmitting.set(false);
      },
    });
  }

  private loadLinks(): void {
    this.isLoading.set(true);
    this.linkService.listLinks().subscribe({
      next: (links) => {
        this.links.set(links);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error, 'Could not reach the Snip API.'));
        this.isLoading.set(false);
      },
    });
  }

  private isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'object' && error.error !== null && 'error' in error.error) {
      const message = (error.error as { error?: unknown }).error;
      if (typeof message === 'string') {
        return message;
      }
    }

    return fallback;
  }
}
