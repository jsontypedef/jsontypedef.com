package user

import "time"

type User struct {
	CreatedAt time.Time `json:"created_at"`
	ID        string    `json:"id"`
	IsAdmin   bool      `json:"isAdmin"`
	Karma     int32     `json:"karma"`
}
