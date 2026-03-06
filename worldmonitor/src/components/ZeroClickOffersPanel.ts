import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import type { ZeroClickOffer } from '@/services/zeroclick';
import { trackZeroClickImpressions } from '@/services/zeroclick';

export class ZeroClickOffersPanel extends Panel {
  private offers: ZeroClickOffer[] = [];
  private onRefreshRequest?: () => void;

  constructor() {
    super({
      id: 'zeroclick-offers',
      title: 'Marketplace',
      showCount: true,
      trackActivity: true,
      infoTooltip: 'Contextual product offers powered by ZeroClick',
    });
    this.showLoading('Loading offers...');

    this.content.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.zc-refresh-btn')) {
        this.showLoading('Loading offers...');
        this.onRefreshRequest?.();
      }
    });
  }

  public setData(offers: ZeroClickOffer[]): void {
    this.offers = offers;
    this.setCount(offers.length);
    this.render();

    const ids = offers.map(o => o.id);
    trackZeroClickImpressions(ids);
  }

  private render(): void {
    if (this.offers.length === 0) {
      this.setContent('<div class="panel-empty">No offers available</div>');
      return;
    }

    const itemsHtml = this.offers.map(offer => {
      const priceHtml = offer.price?.amount
        ? `<span class="zc-price">${escapeHtml(offer.price.currency)} ${escapeHtml(offer.price.amount)}</span>`
        : '';
      const subtitleHtml = offer.subtitle
        ? `<div class="zc-offer-subtitle">${escapeHtml(offer.subtitle)}</div>`
        : '';

      return `<a href="${escapeHtml(offer.clickUrl)}" target="_blank" rel="noopener" class="zc-offer">
        <div class="zc-offer-img-wrap">
          <img src="${escapeHtml(offer.imageUrl)}" alt="${escapeHtml(offer.title)}" class="zc-offer-img" loading="lazy" />
        </div>
        <div class="zc-offer-body">
          <div class="zc-offer-brand">${escapeHtml(offer.brand.name)}</div>
          <div class="zc-offer-title">${escapeHtml(offer.title)}</div>
          ${subtitleHtml}
          <div class="zc-offer-footer">
            ${priceHtml}
            <span class="zc-cta">${escapeHtml(offer.cta)}</span>
          </div>
        </div>
      </a>`;
    }).join('');

    this.setContent(`
      <div class="zc-panel-content">
        <div class="zc-list">${itemsHtml}</div>
        <div class="zc-footer">
          <span class="zc-footer-source">Powered by ZeroClick</span>
          <button class="zc-refresh-btn">Refresh</button>
        </div>
      </div>
      <style>
        .zc-panel-content { display: flex; flex-direction: column; gap: 4px; }
        .zc-list { display: flex; flex-direction: column; gap: 8px; }
        .zc-offer {
          display: flex; gap: 10px; padding: 8px; border-radius: 6px;
          background: var(--panel-item-bg, rgba(255,255,255,0.04));
          text-decoration: none; color: inherit; transition: background 0.15s;
        }
        .zc-offer:hover { background: var(--panel-item-hover-bg, rgba(255,255,255,0.08)); }
        .zc-offer-img-wrap { flex-shrink: 0; width: 64px; height: 64px; border-radius: 4px; overflow: hidden; }
        .zc-offer-img { width: 100%; height: 100%; object-fit: cover; }
        .zc-offer-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .zc-offer-brand { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
        .zc-offer-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .zc-offer-subtitle { font-size: 11px; opacity: 0.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .zc-offer-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .zc-price { font-size: 13px; font-weight: 700; color: var(--accent, #4fc3f7); }
        .zc-cta {
          font-size: 11px; padding: 2px 8px; border-radius: 4px;
          background: var(--accent, #4fc3f7); color: #000; font-weight: 600;
        }
        .zc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 0 0; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 10px; opacity: 0.5;
        }
        .zc-refresh-btn {
          background: none; border: 1px solid rgba(255,255,255,0.15); color: inherit;
          padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;
        }
        .zc-refresh-btn:hover { border-color: rgba(255,255,255,0.3); }
      </style>
    `);
  }

  public setRefreshHandler(handler: () => void): void {
    this.onRefreshRequest = handler;
  }
}
