package server

import (
	"fmt"
	"testing"

	"icloud_distribution/internal/hme"
)

func TestShouldInterruptAliasBatch(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{"创建限额", fmt.Errorf("创建别名失败: %w", hme.ErrAddressCreationLimited), true},
		{"会话失效", fmt.Errorf("HTTP 401: unauthorized"), true},
		{"普通保留失败", fmt.Errorf("保留失败: address unavailable"), false},
		{"无错误", nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := shouldInterruptAliasBatch(tt.err); got != tt.want {
				t.Fatalf("shouldInterruptAliasBatch(%v) = %v, want %v", tt.err, got, tt.want)
			}
		})
	}
}
