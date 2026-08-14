package hme

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIsAddressCreationLimitMessage(t *testing.T) {
	tests := []struct {
		name    string
		message string
		want    bool
	}{
		{"Apple 英文提示", "You have reached the limit of addresses you can create right now. Please try again later.", true},
		{"中文地址提示", "目前你的地址数量已达上限。请稍后再试。", true},
		{"中文标题", "电子邮件已达上限", true},
		{"普通保留失败", "The address is no longer available.", false},
		{"网络限流不是账号地址限额", "Too many requests", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isAddressCreationLimitMessage(tt.message); got != tt.want {
				t.Fatalf("isAddressCreationLimitMessage(%q) = %v, want %v", tt.message, got, tt.want)
			}
		})
	}
}

func TestAddressCreationLimitedErrorSurvivesWrapping(t *testing.T) {
	err := fmt.Errorf("创建别名失败: %w", fmt.Errorf("保留失败: %w", ErrAddressCreationLimited))
	if !errors.Is(err, ErrAddressCreationLimited) {
		t.Fatalf("wrapped error should match ErrAddressCreationLimited: %v", err)
	}
}

func TestCreateAliasRequestsEachEndpointOnce(t *testing.T) {
	generateCalls := 0
	reserveCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/hme/generate":
			generateCalls++
			fmt.Fprint(w, `{"success":true,"result":{"hme":"test@icloud.com"}}`)
		case "/v1/hme/reserve":
			reserveCalls++
			fmt.Fprint(w, `{"success":true,"result":{"hme":{"hme":"test@icloud.com"}}}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)

	client, err := NewClient(nil, "icloud.com", "", false)
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	client.serviceURL = server.URL

	result, err := client.CreateAlias("test")
	if err != nil {
		t.Fatalf("CreateAlias: %v", err)
	}
	if result.Email != "test@icloud.com" {
		t.Fatalf("email = %q", result.Email)
	}
	if generateCalls != 1 || reserveCalls != 1 {
		t.Fatalf("calls: generate=%d reserve=%d, want 1 each", generateCalls, reserveCalls)
	}
}

func TestCreateAliasDoesNotReplayFailedGenerate(t *testing.T) {
	generateCalls := 0
	reserveCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/hme/generate":
			generateCalls++
			http.Error(w, "temporary failure", http.StatusBadGateway)
		case "/v1/hme/reserve":
			reserveCalls++
		}
	}))
	t.Cleanup(server.Close)

	client, err := NewClient(nil, "icloud.com", "", false)
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	client.serviceURL = server.URL

	if _, err := client.CreateAlias("test"); err == nil {
		t.Fatal("CreateAlias should fail")
	}
	if generateCalls != 1 || reserveCalls != 0 {
		t.Fatalf("calls: generate=%d reserve=%d, want generate=1 reserve=0", generateCalls, reserveCalls)
	}
}
