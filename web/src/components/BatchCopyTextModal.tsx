import { useEffect, useState } from 'react'
import { Button, Empty, Input, Modal, Space, Spin, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { Alias, api, publicShareInboxPath } from '../api/client'
import { copyText } from '../utils/clipboard'

interface Props {
  accountId: string
  aliases: Alias[]
  open: boolean
  onClose: () => void
}

// BatchCopyTextModal 批量生成并复制「邮箱----分享链接」文本。
export default function BatchCopyTextModal({ accountId, aliases, open, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setText('')
      setFailedCount(0)
      return
    }

    if (aliases.length === 0) {
      setLoading(false)
      setText('')
      setFailedCount(0)
      return
    }

    let cancelled = false
    setLoading(true)
    setText('')
    setFailedCount(0)

    Promise.allSettled(
      aliases.map(async (alias) => {
        const share = await api.createShare(accountId, alias.email, alias.label)
        const url = `${window.location.origin}${publicShareInboxPath(share.token)}`
        return `${alias.email}----${url}`
      }),
    )
      .then((results) => {
        if (cancelled) return
        const lines: string[] = []
        let failures = 0
        results.forEach((result) => {
          if (result.status === 'fulfilled') lines.push(result.value)
          else failures += 1
        })
        setText(lines.join('\n'))
        setFailedCount(failures)
        if (failures > 0) message.warning(`${lines.length} 个分享链接已生成, ${failures} 个失败`)
      })
      .catch((e) => {
        if (!cancelled) message.error((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accountId, aliases, open])

  const copyAll = async () => {
    if (!text) return
    try {
      await copyText(text)
      message.success('全部分享链接已复制')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  const lineCount = text ? text.split('\n').length : 0

  return (
    <Modal
      title="批量复制 TXT"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" icon={<CopyOutlined />} loading={loading} disabled={!text} onClick={copyAll}>
            复制全部文本
          </Button>
        </Space>
      }
      width={720}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        共 {aliases.length} 个别名，每行一个，格式为「邮箱----分享链接」。已有分享链接会自动复用。
      </Typography.Paragraph>
      {loading ? (
        <div className="batch-copy-loading">
          <Spin />
          <Typography.Text type="secondary">正在生成分享链接...</Typography.Text>
        </div>
      ) : aliases.length === 0 ? (
        <Empty description="暂无别名" />
      ) : (
        <>
          <Input.TextArea
            className="batch-copy-textarea"
            value={text}
            readOnly
            wrap="off"
            autoSize={{ minRows: 8, maxRows: 20 }}
            onFocus={(e) => e.target.select()}
          />
          <Typography.Text type="secondary" className="batch-copy-summary">
            已生成 {lineCount} 条{failedCount > 0 ? `, ${failedCount} 条失败` : ''}
          </Typography.Text>
        </>
      )}
    </Modal>
  )
}
