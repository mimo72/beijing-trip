/**
 * app.js - 北京之旅 应用逻辑
 *
 * 模块化后的主应用文件，负责：
 * - 页面路由（今日/行程/清单/我的）
 * - 时间线渲染
 * - 清单勾选持久化
 * - 预算追踪
 * - Deep link（高德导航、大众点评等）
 */

import tripData from './data.js';

// ---- LocalStorage 持久化（保持原键名 bj_ck / bj_ex） ----
const Storage = {
  get(key, defaultValue) {
    try {
      return JSON.parse(localStorage.getItem('bj_' + key)) || defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    localStorage.setItem('bj_' + key, JSON.stringify(value));
  }
};

// ---- 主应用对象 ----
const App = {
  tab: 'today',
  dayIndex: 0,
  checked: Storage.get('ck', {}),
  expenses: Storage.get('ex', []),
  customChecklist: Storage.get('custom_ck', []),
  collapsedCats: {},
  rootEl: document.getElementById('root'),

  /** 切换底部 Tab */
  go(tab) {
    this.tab = tab;
    document.querySelectorAll('.ti').forEach(el =>
      el.classList.toggle('on', el.dataset.tab === tab)
    );
    this.render();
    this.rootEl.scrollTop = 0;
  },

  /** 渲染当前视图 */
  render() {
    const views = {
      today: () => this.renderToday(),
      trip:  () => this.renderTrip(),
      list:  () => this.renderList(),
      me:    () => this.renderMe()
    };
    this.rootEl.innerHTML = '<div class="ci fd">' + (views[this.tab] || views.today)() + '</div>';
  },

  // ---- 工具方法 ----

  /** 今天日期 YYYY-MM-DD */
  todayDate() {
    return new Date().toISOString().slice(0, 10);
  },

  /** 今天是行程的第几天（索引），不在行程期间返回 -1 */
  todayDayIndex() {
    return tripData.days.findIndex(d => d.d === this.todayDate());
  },

  /** 距出发还有几天 */
  daysLeft() {
    const start = new Date(tripData.startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((start - now) / 864e5);
  },

  /** 当前时间（小数小时，如 14.5 表示 14:30） */
  nowHours() {
    const n = new Date();
    return n.getHours() + n.getMinutes() / 60;
  },

  /** 解析时间字符串为小数小时 */
  parseHours(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  },

  /** 统计以 prefix 开头的已勾选数量 */
  checkedCount(prefix) {
    return Object.keys(this.checked).filter(k => k.startsWith(prefix) && this.checked[k]).length;
  },

  /** 切换勾选状态 */
  toggle(id) {
    this.checked[id] = !this.checked[id];
    Storage.set('ck', this.checked);
    this.render();
  },

  /** 显示 Toast 提示 */
  toast(message, icon) {
    const el = document.getElementById('toast');
    const ic = icon || (message.includes('复制') ? '\u2705' : '\u2139\uFE0F');
    el.innerHTML = '<span>' + ic + '</span><span>' + message + '</span>';
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  },

  /** 复制文本到剪贴板 */
  copyText(text) {
    const fallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        this.toast('已复制');
      } catch {
        this.toast('长按复制：' + text);
      }
      document.body.removeChild(textarea);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => this.toast('已复制')).catch(fallback);
    } else {
      fallback();
    }
  },

  // ---- 预算/花费 ----

  /** 添加一笔花费 */
  addExpense(category, amount) {
    if (!category || !amount || amount <= 0) return;
    this.expenses.push({ c: category, a: Number(amount), d: new Date().toISOString() });
    Storage.set('ex', this.expenses);
    this.render();
  },

  /** 删除一笔花费 */
  deleteExpense(index) {
    this.expenses.splice(index, 1);
    Storage.set('ex', this.expenses);
    this.render();
  },

  /** 某分类已花费总额 */
  spent(category) {
    return this.expenses.filter(e => e.c === category).reduce((sum, e) => sum + e.a, 0);
  },

  /** 编辑一笔花费 - 显示弹窗 */
  editExpense(index) {
    const e = this.expenses[index];
    if (!e) return;
    const options = tripData.budget.categories.map(c =>
      `<option value="${c.id}" ${c.id === e.c ? 'selected' : ''}>${c.ic}${c.nm}</option>`
    ).join('');
    const modal = document.createElement('div');
    modal.className = 'exp-modal-bg';
    modal.onclick = (ev) => { if (ev.target === modal) modal.remove(); };
    modal.innerHTML = `<div class="exp-modal">` +
      `<h3>编辑花费</h3>` +
      `<label>分类</label><select id="edit-xc">${options}</select>` +
      `<label>金额</label><input type="number" id="edit-xa" value="${e.a}" inputmode="numeric">` +
      `<div class="exp-modal-btns">` +
      `<button class="btn-cancel" onclick="this.closest('.exp-modal-bg').remove()">取消</button>` +
      `<button class="btn-save" onclick="App.saveExpenseEdit(${index})">保存</button>` +
      `</div></div>`;
    document.body.appendChild(modal);
  },

  /** 保存编辑后的花费 */
  saveExpenseEdit(index) {
    const c = document.getElementById('edit-xc').value;
    const a = Number(document.getElementById('edit-xa').value);
    if (!c || !a || a <= 0) return;
    this.expenses[index].c = c;
    this.expenses[index].a = a;
    Storage.set('ex', this.expenses);
    document.querySelector('.exp-modal-bg').remove();
    this.render();
  },

  // ---- 天气工具 ----

  /** 根据天气描述返回图标 */
  getWeatherIcon(wx) {
    if (wx.includes('风大') || wx.includes('风力')) return '\uD83D\uDCA8';
    if (wx.includes('干冷')) return '\u2744\uFE0F';
    if (wx.includes('室内')) return '\uD83C\uDFE0';
    if (wx.includes('轻松')) return '\u2600\uFE0F';
    return '\uD83C\uDF24\uFE0F';
  },

  /** 从天气字符串提取温度范围 */
  getWeatherTemp(wx) {
    const match = wx.match(/(-?\d+)°C\/(-?\d+)°C/);
    if (match) return match[1] + '°/' + match[2] + '°';
    return wx.split(' ')[0];
  },

  /** 从天气字符串提取简短穿衣建议 */
  getWeatherTip(wx) {
    if (wx.includes('注意保暖')) return '注意保暖';
    if (wx.includes('防风'))     return '注意防风';
    if (wx.includes('恢复'))     return '室内恢复';
    if (wx.includes('轻松'))     return '轻松出行';
    return '';
  },

  // ---- 清单自定义项目 ----

  /** 添加自定义清单项 */
  addCustomCheckItem() {
    const input = document.getElementById('ck-add-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const id = 'cu' + Date.now();
    this.customChecklist.push({ id, tx: text });
    Storage.set('custom_ck', this.customChecklist);
    input.value = '';
    this.render();
  },

  /** 删除自定义清单项 */
  deleteCustomCheckItem(id) {
    this.customChecklist = this.customChecklist.filter(x => x.id !== id);
    delete this.checked[id];
    Storage.set('custom_ck', this.customChecklist);
    Storage.set('ck', this.checked);
    this.render();
  },

  /** 折叠/展开分类 */
  toggleCategory(catKey) {
    this.collapsedCats[catKey] = !this.collapsedCats[catKey];
    this.render();
  },

  // ---- Deep Links（高德地图、大众点评等） ----

  /** 高德地图导航 */
  navigateTo(name, lat, lng) {
    const appUrl = `iosamap://path?sourceApplication=bjtrip&dlat=${lat}&dlon=${lng}&dname=${encodeURIComponent(name)}&dev=0&t=0`;
    const webUrl = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=bus&coordinate=gaode`;
    window.location.href = appUrl;
    setTimeout(() => { if (!document.hidden) window.location.href = webUrl; }, 1500);
  },

  /** 大众点评搜索 */
  searchDianping(query) {
    const appUrl = 'dianping://searchshoplist?keyword=' + encodeURIComponent(query) + '&cityid=2';
    const webUrl = 'https://m.dianping.com/search/keyword/2/0_' + encodeURIComponent(query);
    window.location.href = appUrl;
    setTimeout(() => { if (!document.hidden) window.location.href = webUrl; }, 1500);
  },

  /** 打开外部链接 */
  openUrl(url) {
    window.open(url, '_blank');
  },

  /** 微信小程序（复制名称提示用户搜索） */
  openWechatMini(name) {
    this.copyText(name);
    this.toast('已复制「' + name + '」打开微信搜索');
  },

  /** 统一 action 分发 */
  handleAction(action) {
    if (action.p === 'nav')      this.navigateTo(action.n, action.la, action.lo);
    else if (action.p === 'dp')  this.searchDianping(action.q);
    else if (action.p === 'url') this.openUrl(action.url);
    else if (action.p === 'cp')  this.copyText(action.tx);
    else if (action.p === 'wx')  this.openWechatMini(action.mp);
  },

  // ==============================
  // TODAY 今日视图
  // ==============================

  renderToday() {
    const today = this.todayDate();
    if (today < tripData.startDate) return this.renderCountdown();
    if (today > tripData.endDate)   return this.renderSummary();
    return this.renderTodayTimeline();
  },

  /** 出发前：倒计时 + 待办 */
  renderCountdown() {
    const daysLeft = this.daysLeft();
    const prep = tripData.checklist.prep;
    const packing = tripData.checklist.packing;
    const prepDone = this.checkedCount('p');
    const packDone = this.checkedCount('k');
    const total = prep.length + packing.length;
    const done = prepDone + packDone;
    const percent = Math.round(done / total * 100);

    const today = this.todayDate();
    const mm = parseInt(today.slice(5, 7));
    const dd = parseInt(today.slice(8, 10));
    const todayFormatted = mm + '/' + dd;

    const urgent = prep.filter(x => !this.checked[x.id] && x.dl && x.dl <= todayFormatted);
    const upcoming = prep.filter(x => !this.checked[x.id] && (!x.dl || x.dl > todayFormatted)).slice(0, 5);

    const ringR = 40, ringC = 2 * Math.PI * ringR;
    const ringOffset = ringC - (ringC * percent / 100);
    let html = `<div class="cnt"><div class="n">${daysLeft}</div><div class="lb2">天后出发</div>` +
      `<div class="cnt-ring"><svg width="100" height="100" viewBox="0 0 100 100">` +
      `<circle cx="50" cy="50" r="${ringR}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="6"/>` +
      `<circle cx="50" cy="50" r="${ringR}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" ` +
      `stroke-dasharray="${ringC}" stroke-dashoffset="${ringOffset}" style="transition:stroke-dashoffset .8s ease"/>` +
      `</svg><div class="cnt-ring-label">${done}/${total}</div></div>` +
      `<div style="font-size:12px;opacity:.8;margin-top:8px">准备进度 ${percent}%</div></div>`;

    // 天气小组件
    html += this.renderWeatherWidget();

    if (urgent.length) {
      html += `<div class="sc" style="color:var(--red)">今日必做</div>`;
      urgent.forEach(x => { html += this.renderCheckItem(x, 1); });
    }
    if (upcoming.length) {
      html += `<div class="sc">即将到来</div>`;
      upcoming.forEach(x => { html += this.renderCheckItem(x); });
    }

    html += `<div style="margin-top:16px;text-align:center">` +
      `<a href="${tripData.links.weather}" target="_blank" style="color:var(--tx2);font-size:12px;text-decoration:none;padding:6px 12px;background:var(--card);border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.06)">` +
      `\uD83C\uDF24 查看北京天气</a></div>`;
    return html;
  },

  /** 天气小组件（5天概览横向滚动） */
  renderWeatherWidget() {
    const today = this.todayDate();
    let html = `<div class="sc">行程天气</div><div class="wx-scroll">`;
    tripData.days.forEach(day => {
      const isToday = day.d === today;
      const dateLabel = parseInt(day.d.slice(5, 7)) + '/' + parseInt(day.d.slice(8, 10));
      html += `<div class="wx-card ${isToday ? 'wx-today' : ''}">` +
        `<div class="wx-date">Day${day.i} ${dateLabel}</div>` +
        `<div class="wx-icon">${this.getWeatherIcon(day.wx)}</div>` +
        `<div class="wx-temp">${this.getWeatherTemp(day.wx)}</div>` +
        `<div class="wx-tip">${this.getWeatherTip(day.wx)}</div></div>`;
    });
    html += `</div>`;
    return html;
  },

  /** 旅途中：当日时间线 */
  renderTodayTimeline() {
    const di = this.todayDayIndex();
    if (di < 0) return this.renderCountdown();
    const day = tripData.days[di];
    const nowH = this.nowHours();

    let html = `<div style="margin-bottom:14px">` +
      `<div style="font-size:19px;font-weight:700;color:var(--ink)">Day${day.i} \u00B7 ${day.l}</div>` +
      `<div style="font-size:13px;color:var(--tx2);margin-top:3px">${day.th}</div>` +
      `<div style="font-size:12px;color:var(--tx2);margin-top:3px">\uD83C\uDF21 ${day.wx}</div>` +
      `<div style="font-size:12px;color:var(--gold);margin-top:2px">\uD83D\uDC54 ${day.ft}</div></div>`;

    day.tl.forEach(item => {
      const startH = this.parseHours(item.t);
      const endH = item.e ? this.parseHours(item.e) : startH + 1;
      html += this.renderTimelineItem(item, nowH >= endH ? 'past' : nowH >= startH ? 'cur' : '');
    });

    if (day.nt && day.nt.length) {
      html += `<div class="sc">提醒</div>`;
      day.nt.forEach(n => { html += `<div class="nt">${n}</div>`; });
    }
    if (day.pb) html += `<div class="plb">${day.pb}</div>`;
    return html;
  },

  /** 旅程结束：回顾 */
  renderSummary() {
    const totalSpent = this.expenses.reduce((sum, e) => sum + e.a, 0);
    let html = `<div style="text-align:center;padding:20px 0">` +
      `<div style="font-size:40px">\uD83C\uDFEE</div>` +
      `<div style="font-size:20px;font-weight:700;color:var(--ink);margin-top:8px">旅程回顾</div>` +
      `<div style="font-size:13px;color:var(--tx2)">大年初四至初八 \u00B7 北京</div></div>` +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0">` +
      `<div class="ic2" style="text-align:center"><div style="font-size:32px;font-weight:800;color:var(--red)">5</div><div style="font-size:12px;color:var(--tx2)">天行程</div></div>` +
      `<div class="ic2" style="text-align:center"><div style="font-size:32px;font-weight:800;color:var(--red)">\u00A5${totalSpent}</div><div style="font-size:12px;color:var(--tx2)">总花费</div></div></div>` +
      `<div class="sc">花费明细</div>`;

    tripData.budget.categories.forEach(c => {
      const s = this.spent(c.id);
      html += `<div class="ic2"><div class="bw"><span class="bn">${c.ic} ${c.nm}</span><span class="bm">\u00A5${s}/\u00A5${c.am}</span></div></div>`;
    });
    return html;
  },

  // ==============================
  // TRIP 行程视图
  // ==============================

  renderTrip() {
    const today = this.todayDate();
    const tdi = this.todayDayIndex();
    if (this.dayIndex === undefined) this.dayIndex = Math.max(0, tdi);

    let html = `<div class="dt" id="dTabs">`;
    tripData.days.forEach((d, i) => {
      html += `<div class="dtb ${i === this.dayIndex ? 'on' : ''}" onclick="App.selectDay(${i})">Day${d.i} \u00B7 ${d.l.replace('大年', '')}</div>`;
    });
    html += `</div>`;

    const day = tripData.days[this.dayIndex];
    const isToday = day.d === today;
    const nowH = isToday ? this.nowHours() : -1;

    html += `<div style="margin-bottom:14px">` +
      `<div style="font-size:17px;font-weight:700;color:var(--ink)">${day.th}</div>` +
      `<div style="font-size:12px;color:var(--tx2);margin-top:3px">${day.d} ${day.w} \u00B7 ${day.l}\u3000\uD83C\uDF21 ${day.wx}</div>` +
      `<div style="font-size:12px;color:var(--gold);margin-top:2px">\uD83D\uDC54 ${day.ft}</div></div>`;

    day.tl.forEach(item => {
      const startH = this.parseHours(item.t);
      const endH = item.e ? this.parseHours(item.e) : startH + 1;
      html += this.renderTimelineItem(item, isToday ? (nowH >= endH ? 'past' : nowH >= startH ? 'cur' : '') : '');
    });

    if (day.nt && day.nt.length) {
      html += `<div class="sc">提醒</div>`;
      day.nt.forEach(n => { html += `<div class="nt">${n}</div>`; });
    }
    if (day.pb) html += `<div class="plb">${day.pb}</div>`;

    const budget = day.bg;
    const budgetNames = { food: '餐饮', tickets: '门票', transport: '交通', shopping: '伴手礼' };
    html += `<div class="sc">当日预算</div><div class="ic2">`;
    Object.entries(budget).forEach(([k, v]) => {
      html += `<div class="bw"><span class="bn">${budgetNames[k] || k}</span><span class="bm">\u00A5${v}</span></div>`;
    });
    html += `</div>`;
    return html;
  },

  /** 切换日期选项卡 */
  selectDay(index) {
    this.dayIndex = index;
    this.render();
    setTimeout(() => {
      const tabs = document.getElementById('dTabs');
      if (tabs) {
        const active = tabs.querySelector('.dtb.on');
        if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  },

  // ==============================
  // TIMELINE ITEM 时间线条目
  // ==============================

  renderTimelineItem(item, status) {
    const typeLabels = {
      flight: '航班', transport: '交通', attraction: '景点', food: '美食',
      explore: '探索', rest: '休息', prepare: '准备', shopping: '购物', free: '自由'
    };
    const badgeClasses = {
      flight: 'bf', transport: 'bt', attraction: 'ba', food: 'bo',
      explore: 'be', rest: 'br', prepare: 'br', shopping: 'bs', free: 'bx'
    };

    // 确认状态标签
    const confidenceHtml = item.cf
      ? `<span class="${item.cf === 'v' ? 'cv' : item.cf === 'l' ? 'cl2' : 'cu'}">${item.cf === 'v' ? '\u2705已验证' : item.cf === 'l' ? '\uD83D\uDD36大概率' : '\u26A0\uFE0F待确认'}</span>`
      : '';

    // 操作按钮
    let actionsHtml = '';
    if (item.ac && item.ac.length) {
      actionsHtml = '<div class="as" onclick="event.stopPropagation()">';
      item.ac.forEach(a => {
        const btnClass = a.p === 'nav' ? 'an' : a.p === 'dp' ? 'af' : (a.p === 'url' || a.p === 'wx') ? 'ak' : 'ac';
        const icon = a.p === 'nav' ? '\uD83E\uDDED' : a.p === 'dp' ? '\uD83D\uDD0D' : a.p === 'url' ? '\uD83D\uDD17' : a.p === 'wx' ? '\uD83D\uDCAC' : '\uD83D\uDCCB';
        if (a.p === 'dp') {
          actionsHtml += `<button class="ab ${btnClass}" onclick="App.searchDianping('${a.q.replace(/'/g, "\\'")}')">${icon} ${a.l}</button>`;
        } else if (a.p === 'url') {
          actionsHtml += `<a class="ab ${btnClass}" href="${a.url}">${icon} ${a.l}</a>`;
        } else {
          actionsHtml += `<button class="ab ${btnClass}" onclick="App.handleAction(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(a))}')))">${icon} ${a.l}</button>`;
        }
      });
      actionsHtml += '</div>';
    }

    return `<div class="tl tl-stagger ${status}"><div class="cd" onclick="this.classList.toggle('ex')">` +
      `<div class="cd-h"><div class="tc"><div class="t">${item.t}</div>${item.e ? `<div class="e">${item.e}</div>` : ''}</div>` +
      `<div class="cd-b"><div class="cd-t"><span class="bg ${badgeClasses[item.p] || 'br'}">${typeLabels[item.p] || item.p}</span>${item.n}<span class="ar">\u25BC</span></div>` +
      `<div class="cd-s">${(item.dt || '').split('\\n')[0]}</div></div></div>` +
      `<div class="cd-d">${(item.dt || '').replace(/\\n/g, '<br>')}${confidenceHtml ? '<div style="margin-top:6px">' + confidenceHtml + '</div>' : ''}${actionsHtml}</div>` +
      `</div></div>`;
  },

  // ==============================
  // LIST 清单视图
  // ==============================

  renderList() {
    const prep = tripData.checklist.prep;
    const packing = tripData.checklist.packing;
    const prepDone = this.checkedCount('p');
    const packDone = this.checkedCount('k');

    // 出发准备 - 可折叠
    const prepCollapsed = this.collapsedCats['prep'];
    let html = `<div class="ck-cat-hd ${prepCollapsed ? 'collapsed' : ''}" onclick="App.toggleCategory('prep')">` +
      `<span class="ck-cat-name" style="font-size:15px;color:var(--ink)">出发准备</span>` +
      `<span class="ck-cat-prog">${prepDone}/${prep.length} <span class="ck-cat-arrow">\u25BC</span></span></div>`;
    if (!prepCollapsed) {
      prep.forEach(x => { html += this.renderCheckItem(x, x.u); });
    }

    // 行李清单 - 分类折叠
    const packCollapsed = this.collapsedCats['packing'];
    html += `<div class="ck-cat-hd ${packCollapsed ? 'collapsed' : ''}" onclick="App.toggleCategory('packing')" style="margin-top:16px">` +
      `<span class="ck-cat-name" style="font-size:15px;color:var(--ink)">行李清单</span>` +
      `<span class="ck-cat-prog">${packDone}/${packing.length} <span class="ck-cat-arrow">\u25BC</span></span></div>`;

    if (!packCollapsed) {
      const categories = [...new Set(packing.map(x => x.ct))];
      categories.forEach(cat => {
        const catKey = 'pk_' + cat;
        const catItems = packing.filter(x => x.ct === cat);
        const catDone = catItems.filter(x => this.checked[x.id]).length;
        const catCollapsed = this.collapsedCats[catKey];

        html += `<div class="ck-cat-hd ${catCollapsed ? 'collapsed' : ''}" onclick="App.toggleCategory('${catKey}')">` +
          `<span class="ck-cat-name">${cat}</span>` +
          `<span class="ck-cat-prog">${catDone}/${catItems.length} <span class="ck-cat-arrow">\u25BC</span></span></div>`;
        if (!catCollapsed) {
          catItems.forEach(x => { html += this.renderCheckItem(x); });
        }
      });
    }

    // 自定义清单项
    const customDone = this.customChecklist.filter(x => this.checked[x.id]).length;
    html += `<div class="sc">自定义项目 (${customDone}/${this.customChecklist.length})</div>`;
    this.customChecklist.forEach(x => {
      const isDone = this.checked[x.id];
      html += `<div class="ck ${isDone ? 'dn' : ''}" style="cursor:default">` +
        `<div class="cx" onclick="App.toggle('${x.id}')"><svg class="cx-svg" viewBox="0 0 16 16"><path d="M3 8l4 4 6-7"/></svg></div><div style="flex:1" onclick="App.toggle('${x.id}')">` +
        `<div class="ct2">${x.tx}</div></div>` +
        `<button class="ab ac" onclick="event.stopPropagation();App.deleteCustomCheckItem('${x.id}')" style="font-size:11px">\u2715</button></div>`;
    });

    // 添加自定义项
    html += `<div class="ck-add-wrap">` +
      `<input type="text" id="ck-add-input" placeholder="添加自定义项目..." onkeydown="if(event.key==='Enter')App.addCustomCheckItem()">` +
      `<button onclick="App.addCustomCheckItem()">添加</button></div>`;

    return html;
  },

  /** 渲染单个清单项 */
  renderCheckItem(item, isUrgent) {
    const isDone = this.checked[item.id];
    return `<div class="ck ${isDone ? 'dn' : ''}" onclick="App.toggle('${item.id}')"><div class="cx"><svg class="cx-svg" viewBox="0 0 16 16"><path d="M3 8l4 4 6-7"/></svg></div><div style="flex:1">` +
      `<div class="ct2">${item.tx}${isUrgent ? '<span class="ug">紧急</span>' : ''}${item.dl ? `<span class="dl">${item.dl}前</span>` : ''}</div>` +
      `${item.nt ? `<div class="cm">${item.nt}</div>` : ''}</div></div>`;
  },

  // ==============================
  // ME 我的视图
  // ==============================

  renderMe() {
    const flights = tripData.flights;
    const hotel = tripData.hotel;

    // 行程概览统计
    let html = this.renderTripStats();

    html += `<div class="sc">航班信息</div>` +
      this.renderFlightCard(flights.outbound, '去程') +
      this.renderFlightCard(flights.return, '回程');

    html += `<div class="sc">酒店信息</div><div class="ic2">` +
      `<div class="ir"><div><div class="il">酒店</div><div class="iv">${hotel.name}</div></div></div>` +
      `<div class="ir"><div><div class="il">地址</div><div class="iv" style="font-size:13px">${hotel.address}</div></div></div>` +
      `<div class="ir"><div><div class="il">地铁</div><div class="iv" style="font-size:13px">${hotel.metro}</div></div></div>` +
      `<div class="as" style="margin-top:6px"><button class="ab an" onclick="App.navigateTo('${hotel.name}',${hotel.lat},${hotel.lng})">\uD83E\uDDED 导航到酒店</button></div></div>`;

    html += `<div class="sc">停车信息</div><div class="ic2"><div class="iv">${tripData.parking.name}</div>` +
      `<div class="cm">${tripData.parking.note} \u00B7 ${tripData.parking.cost}</div></div>`;

    // 预算追踪（增强版）
    html += this.renderBudgetSection();

    // 花费记录（按日期分组 + 可编辑）
    html += this.renderExpenseRecords();

    // 快捷链接
    html += `<div class="sc">快捷链接</div><div class="ic2"><div class="as" style="flex-wrap:wrap">` +
      `<a href="${tripData.links.weather}" target="_blank" class="ab an">\uD83C\uDF24 北京天气</a>` +
      `<a href="${tripData.links.flightTracker}" target="_blank" class="ab an">\u2708\uFE0F 航旅纵横</a>` +
      `<a href="${tripData.links.palaceMuseum}" target="_blank" class="ab ak">\uD83C\uDFEF 故宫购票</a>` +
      `<a href="${tripData.links.nationalMuseum}" target="_blank" class="ab ak">\uD83C\uDFDB 国博预约</a></div></div>`;

    // 紧急联系
    html += `<div class="sc">紧急联系</div><div class="ic2">`;
    tripData.contacts.forEach(c => {
      html += `<div class="ir"><span style="font-size:13px">${c.n}</span><a href="tel:${c.p}" style="font-size:14px;font-weight:700;color:var(--red);text-decoration:none">${c.p}</a></div>`;
    });
    html += `</div>`;

    // 外观设置（深色模式切换）
    const currentTheme = typeof getTheme === 'function' ? getTheme() : 'auto';
    html += `<div class="sc">外观设置</div><div class="ic2">` +
      `<div style="font-size:13px;color:var(--tx2);margin-bottom:4px">主题模式</div>` +
      `<div class="theme-toggle">` +
      `<button class="theme-btn ${currentTheme === 'light' ? 'active' : ''}" onclick="setTheme('light')">浅色</button>` +
      `<button class="theme-btn ${currentTheme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">深色</button>` +
      `<button class="theme-btn ${currentTheme === 'auto' ? 'active' : ''}" onclick="setTheme('auto')">跟随系统</button>` +
      `</div></div>`;

    return html;
  },

  /** 行程概览统计卡片 */
  renderTripStats() {
    let attractionCount = 0;
    let foodCount = 0;
    let walkEstimate = 0;
    tripData.days.forEach(day => {
      day.tl.forEach(item => {
        if (item.p === 'attraction') attractionCount++;
        if (item.p === 'food') foodCount++;
        if (item.p === 'attraction' || item.p === 'explore') walkEstimate += 5000;
      });
    });
    return `<div class="stats-grid">` +
      `<div class="stat-item"><div class="stat-icon">\uD83D\uDCC5</div><div class="stat-num">5</div><div class="stat-label">总天数</div></div>` +
      `<div class="stat-item"><div class="stat-icon">\uD83C\uDFDB\uFE0F</div><div class="stat-num">${attractionCount}</div><div class="stat-label">景点</div></div>` +
      `<div class="stat-item"><div class="stat-icon">\uD83C\uDF5C</div><div class="stat-num">${foodCount}</div><div class="stat-label">美食</div></div>` +
      `<div class="stat-item"><div class="stat-icon">\uD83D\uDEB6</div><div class="stat-num">${Math.round(walkEstimate / 10000)}w</div><div class="stat-label">预估步数</div></div>` +
      `</div>`;
  },

  /** 预算追踪区域（增强版：环形图 + 柱状图） */
  renderBudgetSection() {
    const totalSpent = this.expenses.reduce((sum, e) => sum + e.a, 0);
    const totalBudget = tripData.budget.total;
    const spentPercent = Math.min(100, Math.round(totalSpent / totalBudget * 100));
    const remaining = totalBudget - totalSpent;

    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - spentPercent / 100);
    const ringColor = spentPercent > 90 ? '#C62828' : spentPercent > 60 ? '#D4A853' : '#2E7D32';

    let html = `<div class="sc">预算追踪</div><div class="ic2">`;

    // 环形图
    html += `<div class="budget-ring-wrap">` +
      `<div class="budget-ring">` +
      `<svg width="110" height="110" viewBox="0 0 110 110">` +
      `<circle cx="55" cy="55" r="${radius}" fill="none" stroke="#ECEFF1" stroke-width="10"/>` +
      `<circle cx="55" cy="55" r="${radius}" fill="none" stroke="${ringColor}" stroke-width="10" ` +
      `stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" stroke-linecap="round"/>` +
      `</svg>` +
      `<div class="budget-ring-label"><div class="ring-amount">${spentPercent}%</div><div class="ring-sub">已使用</div></div>` +
      `</div>` +
      `<div style="text-align:left">` +
      `<div style="font-size:12px;color:var(--tx2)">总预算(2人)</div>` +
      `<div style="font-size:18px;font-weight:800;color:var(--ink)">\u00A5${totalBudget}</div>` +
      `<div style="font-size:12px;color:var(--tx2);margin-top:6px">已花费</div>` +
      `<div style="font-size:16px;font-weight:700;color:${totalSpent > totalBudget ? 'var(--red)' : 'var(--ink)'}">\u00A5${totalSpent}</div>` +
      `<div style="font-size:12px;color:var(--tx2);margin-top:6px">剩余</div>` +
      `<div style="font-size:14px;font-weight:600;color:${remaining < 0 ? 'var(--red)' : 'var(--grn)'}">\u00A5${remaining}</div>` +
      `</div></div>`;

    // 分类柱状图
    const maxVal = Math.max(...tripData.budget.categories.map(c => Math.max(c.am, this.spent(c.id))));
    html += `<div class="budget-legend">` +
      `<span><span class="dot" style="background:#E0E0E0"></span>预算</span>` +
      `<span><span class="dot" style="background:var(--red)"></span>实际</span></div>`;
    html += `<div class="budget-bars">`;
    tripData.budget.categories.forEach(c => {
      const s = this.spent(c.id);
      const budgetH = maxVal > 0 ? Math.round(c.am / maxVal * 70) : 0;
      const spentH = maxVal > 0 ? Math.round(s / maxVal * 70) : 0;
      html += `<div class="budget-bar-col">` +
        `<div class="budget-bar-val">\u00A5${s}</div>` +
        `<div class="budget-bar-group">` +
        `<div class="budget-bar-item bar-budget" style="height:${budgetH}px"></div>` +
        `<div class="budget-bar-item bar-spent" style="height:${spentH}px"></div>` +
        `</div>` +
        `<div class="budget-bar-label">${c.ic}<br>${c.nm}</div></div>`;
    });
    html += `</div>`;

    // 分类明细条
    tripData.budget.categories.forEach(c => {
      const s = this.spent(c.id);
      const pc = Math.min(100, Math.round(s / c.am * 100));
      const color = pc > 90 ? 'var(--red)' : pc > 60 ? 'var(--gold)' : 'var(--grn)';
      html += `<div class="bw"><span class="bn">${c.ic} ${c.nm}</span><div class="bb"><div class="bl" style="width:${pc}%;background:${color}"></div></div><span class="bm">\u00A5${s}/${c.am}</span></div>`;
    });

    // 记账输入行
    html += `<div class="bi"><select id="xc">${tripData.budget.categories.map(c => `<option value="${c.id}">${c.ic}${c.nm}</option>`).join('')}</select>` +
      `<input type="number" id="xa" placeholder="金额" inputmode="numeric">` +
      `<button onclick="App.addExpense(document.getElementById('xc').value,document.getElementById('xa').value);document.getElementById('xa').value=''">记</button></div></div>`;

    return html;
  },

  /** 花费记录（按日期分组 + 可编辑） */
  renderExpenseRecords() {
    if (!this.expenses.length) return '';

    let html = `<div class="sc">花费记录</div>`;
    const categoryMap = {};
    tripData.budget.categories.forEach(c => { categoryMap[c.id] = c; });

    // 按日期分组
    const groups = {};
    this.expenses.forEach((e, idx) => {
      const d = new Date(e.d);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push({ ...e, idx });
    });

    // 按日期倒序显示
    const sortedDates = Object.keys(groups).sort().reverse();
    sortedDates.forEach(dateKey => {
      const parts = dateKey.split('-');
      const dayTotal = groups[dateKey].reduce((sum, e) => sum + e.a, 0);
      html += `<div class="exp-date-group">${parseInt(parts[1])}月${parseInt(parts[2])}日 \u00B7 共\u00A5${dayTotal}</div>`;

      groups[dateKey].slice().reverse().forEach(e => {
        const c = categoryMap[e.c] || { ic: '', nm: e.c };
        const dt = new Date(e.d);
        const ts = `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
        html += `<div class="ck" style="cursor:pointer" onclick="App.editExpense(${e.idx})"><div style="flex:1">` +
          `<div class="ct2">${c.ic} ${c.nm}\u3000\u00A5${e.a}</div><div class="cm">${ts} \u00B7 点击编辑</div></div>` +
          `<button class="ab ac" onclick="event.stopPropagation();App.deleteExpense(${e.idx})" style="font-size:11px">删除</button></div>`;
      });
    });

    return html;
  },

  /** 渲染航班卡片 */
  renderFlightCard(flight, label) {
    const cityNames = { '虹桥T2': { n: '上海虹桥T2' }, '首都T2': { n: '北京首都T2' } };
    const fromCity = cityNames[flight.from] || { n: flight.from };
    const toCity = cityNames[flight.to] || { n: flight.to };
    return `<div class="fc"><div style="display:flex;justify-content:space-between"><span class="fl">${label} \u00B7 ${flight.code}</span><span class="fl">${flight.date} ${flight.airline || ''}</span></div>` +
      `<div class="fr"><div class="fy"><div class="ft">${flight.depart}</div><div class="fn">${fromCity.n}</div></div>` +
      `<div class="fm"><span class="pl">\u2708\uFE0F</span></div>` +
      `<div class="fy"><div class="ft">${flight.arrive}</div><div class="fn">${toCity.n}</div></div></div></div>`;
  }
};

// 暴露到全局作用域（供 HTML onclick 调用）
window.App = App;

// 初始渲染
App.render();

// 每分钟刷新"今日"视图
setInterval(() => { if (App.tab === 'today') App.render(); }, 60000);

// ---- 深色模式切换 ----
(function() {
  const THEME_KEY = 'bj_theme';
  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, mode);
    // Update meta theme-color for browser chrome
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', isDark ? '#121212' : '#C62828');
    }
  }
  // Initialize on load
  const saved = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(saved);
  // Expose for App.renderMe toggle buttons
  window.setTheme = function(mode) {
    applyTheme(mode);
    // Re-render to update toggle button active states
    if (App.tab === 'me') App.render();
  };
  window.getTheme = function() {
    return localStorage.getItem(THEME_KEY) || 'auto';
  };
})();

// ---- 离线状态检测 ----
(function() {
  var banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.textContent = '\u5F53\u524D\u79BB\u7EBF \u00B7 \u6570\u636E\u5DF2\u7F13\u5B58';
  banner.style.cssText = 'display:none;background:#C62828;color:#fff;text-align:center;font-size:12px;padding:6px 0;position:fixed;top:0;left:0;right:0;z-index:9999;transition:transform .3s ease;';
  document.body.insertBefore(banner, document.body.firstChild);

  function updateStatus() {
    if (navigator.onLine) {
      banner.style.display = 'none';
      document.body.style.paddingTop = '';
    } else {
      banner.style.display = 'block';
      document.body.style.paddingTop = '28px';
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
})();
