import { useEffect, useState } from 'react'
import { Button, Input, List, Modal, Popconfirm, Space, Typography, message } from 'antd'
import { CopyOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, publicShareInboxPath } from '../api/client'
import { copyText } from '../utils/clipboard'

interface ShareItem {
  token: string
  account_id: string
  alias: string
  label?: string
  created_at: string
}

interface Props {
  accountId: string
  open: boolean
  onClose: () => void
}

// ShareModal 分享链接管理: 查看/复制/吊销该账号的所有分享链接。
// 创建分享在别名列表的「分享」按钮触发,此处展示已有链接。
export default function ShareModal({ accountId, open, onClose }: Props) {
  const [shares, setShares] = useState<ShareItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setShares((await api.listShares(accountId)) || [])
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const shareUrl = (token: string) => `${window.location.origin}${publicShareInboxPath(token)}`

  const copy = async (token: string) => {
    const url = shareUrl(token)
    try {
      await copyText(url)
      message.success('链接已复制')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  return (
    <Modal title="分享链接管理" open={open} onCancel={onClose} footer={null} width={720}>
      <Typography.Paragraph type="secondary">
        持有链接的人无需登录即可查看对应邮箱的邮件 (只读)。请只把链接发给信任的人。
      </Typography.Paragraph>
      <List
        loading={loading}
        dataSource={shares}
        locale={{ emptyText: '暂无分享链接,在别名列表点击「分享」创建' }}
        renderItem={(sh) => (
          <List.Item className="share-list-item">
            <div className="share-list-content">
              <div className="share-list-header">
                <List.Item.Meta
                  title={
                    <div className="share-list-title">
                      <LinkOutlined />
                      <Typography.Text className="share-list-alias" ellipsis={{ tooltip: sh.alias }}>
                        {sh.alias}
                      </Typography.Text>
                      {sh.label && (
                        <Typography.Text className="share-list-label" type="secondary" ellipsis={{ tooltip: sh.label }}>
                          ({sh.label})
                        </Typography.Text>
                      )}
                    </div>
                  }
                  description={`创建于 ${dayjs(sh.created_at).format('YYYY-MM-DD HH:mm')}`}
                />
                <Space className="share-list-actions" size={8}>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copy(sh.token)}>
                    复制链接
                  </Button>
                  <Popconfirm title="吊销后链接立即失效" onConfirm={() => api.deleteShare(sh.token).then(load)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      吊销
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              <Input
                className="share-list-url"
                size="small"
                readOnly
                value={shareUrl(sh.token)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </List.Item>
        )}
      />
    </Modal>
  )
}
