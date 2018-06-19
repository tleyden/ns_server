// @author Couchbase <info@couchbase.com>
// @copyright 2017-2018 Couchbase, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"errors"
	"os"
	"sync"
)

var (
	// ErrCanceled is an error used as indication that operation of
	// interest was canceled.
	ErrCanceled = errors.New("canceled")
)

// Canceler provides a generic way to cancel and wait for termination of an
// active object (object that is backed by a goroutine).
type Canceler struct {
	cancel     chan struct{}
	cancelOnce *sync.Once

	done     chan struct{}
	doneOnce *sync.Once
}

// CancelFollower exposes APIs that must only be used by the active object
// itself.
type CancelFollower Canceler

// NewCanceler creates a new Canceler object.
func NewCanceler() *Canceler {
	return &Canceler{
		cancel:     make(chan struct{}),
		cancelOnce: &sync.Once{},

		done:     make(chan struct{}),
		doneOnce: &sync.Once{},
	}
}

// Cancel orders the underlying active object to cancel whatever its doing.
func (c *Canceler) Cancel() {
	c.cancelOnce.Do(func() { close(c.cancel) })
}

// Wait waits for the active object to finish.
func (c *Canceler) Wait() {
	<-c.done
}

// Follower can be used by the active object to gain access to the
// active-object-only interface to of the Canceler.
func (c *Canceler) Follower() *CancelFollower {
	return (*CancelFollower)(c)
}

// Done indicates that the active object finished its operation.
func (f *CancelFollower) Done() {
	f.doneOnce.Do(func() { close(f.done) })
}

// Cancel returns a channel that the active object should monitor for the
// orders to cancel its operation.
func (f *CancelFollower) Cancel() <-chan struct{} {
	return f.cancel
}

// CloseOnce wraps an os.File and ensures that the file is only closed once.
type CloseOnce struct {
	*os.File
	once sync.Once
}

// Close closes the underlying file. But only on the first
// invocation. Subsequent invocations simply return success.
func (c *CloseOnce) Close() error {
	var err error
	c.once.Do(func() { err = c.File.Close() })

	return err
}
