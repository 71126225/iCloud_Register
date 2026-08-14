// copyText 在 HTTPS Clipboard API 不可用时回退到传统复制方式。
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 权限或浏览器策略拒绝时继续尝试兼容方案。
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  let copied = false
  try {
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
  }

  if (!copied) {
    throw new Error('当前浏览器不支持自动复制，请手动复制链接')
  }
}
