const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, 'shopping-list.html').replace(/\\/g, '/');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 (테스트 간 독립성 보장)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ─── 아이템 추가 ───────────────────────────────────────────
test('버튼 클릭으로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.click('button:has-text("추가")');

  await expect(page.locator('.item-text').first()).toHaveText('우유');
  await expect(page.locator('#totalCount')).toHaveText('1');
});

test('Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '달걀');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('.item-text').first()).toHaveText('달걀');
  await expect(page.locator('#totalCount')).toHaveText('1');
});

test('여러 아이템 연속 추가', async ({ page }) => {
  const items = ['사과', '바나나', '오렌지'];
  for (const item of items) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  const texts = await page.locator('.item-text').allTextContents();
  expect(texts).toEqual(items);
  await expect(page.locator('#totalCount')).toHaveText('3');
});

test('빈 값은 추가되지 않음', async ({ page }) => {
  await page.fill('#itemInput', '   ');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#totalCount')).toHaveText('0');
  await expect(page.locator('#emptyMsg')).toBeVisible();
});

test('추가 후 입력창 초기화', async ({ page }) => {
  await page.fill('#itemInput', '버터');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#itemInput')).toHaveValue('');
});

// ─── 아이템 체크 ───────────────────────────────────────────
test('체크박스 클릭으로 완료 표시', async ({ page }) => {
  await page.fill('#itemInput', '치즈');
  await page.press('#itemInput', 'Enter');

  await page.locator('li input[type="checkbox"]').first().check();

  await expect(page.locator('li').first()).toHaveClass(/checked/);
  await expect(page.locator('.item-text').first()).toHaveCSS('text-decoration', /line-through/);
  await expect(page.locator('#checkedCount')).toHaveText('1');
});

test('체크박스 재클릭으로 완료 해제', async ({ page }) => {
  await page.fill('#itemInput', '요구르트');
  await page.press('#itemInput', 'Enter');

  const cb = page.locator('li input[type="checkbox"]').first();
  await cb.check();
  await cb.uncheck();

  await expect(page.locator('li').first()).not.toHaveClass(/checked/);
  await expect(page.locator('#checkedCount')).toHaveText('0');
});

test('여러 아이템 중 일부만 체크', async ({ page }) => {
  for (const item of ['항목A', '항목B', '항목C']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  const checkboxes = page.locator('li input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(2).check();

  await expect(page.locator('#checkedCount')).toHaveText('2');
  await expect(page.locator('#totalCount')).toHaveText('3');
});

// ─── 아이템 삭제 ───────────────────────────────────────────
test('개별 삭제 버튼으로 아이템 삭제', async ({ page }) => {
  await page.fill('#itemInput', '참치');
  await page.press('#itemInput', 'Enter');

  await page.locator('.delete-btn').first().click();

  await expect(page.locator('#totalCount')).toHaveText('0');
  await expect(page.locator('#emptyMsg')).toBeVisible();
});

test('여러 아이템 중 특정 아이템 삭제', async ({ page }) => {
  for (const item of ['첫번째', '두번째', '세번째']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 두 번째 아이템 삭제
  await page.locator('.delete-btn').nth(1).click();

  const texts = await page.locator('.item-text').allTextContents();
  expect(texts).toEqual(['첫번째', '세번째']);
  await expect(page.locator('#totalCount')).toHaveText('2');
});

test('완료 항목 일괄 삭제', async ({ page }) => {
  for (const item of ['A', 'B', 'C']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // A, C 체크
  const checkboxes = page.locator('li input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(2).check();

  await page.click('.clear-btn');

  const texts = await page.locator('.item-text').allTextContents();
  expect(texts).toEqual(['B']);
  await expect(page.locator('#totalCount')).toHaveText('1');
  await expect(page.locator('#checkedCount')).toHaveText('0');
});

// ─── localStorage 지속성 ───────────────────────────────────
test('페이지 새로고침 후 데이터 유지', async ({ page }) => {
  await page.fill('#itemInput', '새로고침테스트');
  await page.press('#itemInput', 'Enter');

  await page.reload();

  await expect(page.locator('.item-text').first()).toHaveText('새로고침테스트');
  await expect(page.locator('#totalCount')).toHaveText('1');
});

test('체크 상태도 새로고침 후 유지', async ({ page }) => {
  await page.fill('#itemInput', '체크유지테스트');
  await page.press('#itemInput', 'Enter');

  await page.locator('li input[type="checkbox"]').first().check();
  await page.reload();

  await expect(page.locator('li').first()).toHaveClass(/checked/);
  await expect(page.locator('#checkedCount')).toHaveText('1');
});

// ─── UI 상태 ──────────────────────────────────────────────
test('초기 상태: 빈 메시지 표시', async ({ page }) => {
  await expect(page.locator('#emptyMsg')).toBeVisible();
  await expect(page.locator('#totalCount')).toHaveText('0');
  await expect(page.locator('#checkedCount')).toHaveText('0');
});

test('아이템 추가 시 빈 메시지 숨김', async ({ page }) => {
  await page.fill('#itemInput', '테스트');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#emptyMsg')).toBeHidden();
});