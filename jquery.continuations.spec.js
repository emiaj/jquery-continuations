﻿// These tests prove that this can be swapped out
$.continuations.useAmplify();

describe('Global jQuery conventions', function () {
    // these should prove to be beneficial for showing loading animations
    it('should publish the AjaxStarted topic when a request starts', function () {
        var invoked = false;
        runs(function () {
            amplify.subscribe('AjaxStarted', function () {
                invoked = true;
            });

            $.ajax({
                url: '', // should request the current page
                type: 'get'
            });
        });

        waits(1000);

        runs(function () {
            expect(invoked).toEqual(true);
        });
    });

    it('should published the AjaxCompleted topic when a request completes', function () {
        var invoked = false;
        runs(function () {
            amplify.subscribe('AjaxCompleted', function () {
                invoked = true;
            });

            $.ajax({
                url: '', // should request the current page
                type: 'get'
            });
        });

        waits(1000);

        runs(function () {
            expect(invoked).toEqual(true);
        });
    });
});

describe('Request correlation', function () {
    var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });

    it('should match request/response headers to track each request', function () {
        var startingId = '';
        var completedId = '';

        amplify.subscribe('AjaxStarted', function (request) {
            startingId = request.correlationId;
            // if it hangs, we never got the topic
            server.respondWith([200,
                { 'Content-Type': 'application/json', 'X-Correlation-Id': startingId }, '{success: true}'
            ]);
        });

        amplify.subscribe('AjaxCompleted', function (response) {
            completedId = response.correlationId;
        });

        runs(function () {
            $.ajax({
                url: '/testing'
            });

            server.respond();
        });

        waits(500);

        runs(function () {
            expect(completedId == '').toEqual(false);
            expect(completedId).toEqual(startingId);
        });
    });
});

describe('Integrated refresh policy tests', function () {
    var server;
    var refresh;
    beforeEach(function () {
        server = sinon.fakeServer.create();
        refresh = $.continuations.windowService.refresh;
    });
    afterEach(function () {
        server.restore();
        $.continuations.windowService.refresh = refresh;
    });

    it('should refresh the page when refresh is true', function () {
        $.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"refresh":"true"}'
        ]);

        runs(function () {
            $.ajax({
                url: '/refresh',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect($.continuations.windowService.refresh).toHaveBeenCalled();
        });
    });

    it('should not refresh the page when refresh is false', function () {
        $.continuations.windowService.refresh = jasmine.createSpy('windowService.refresh');

        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"refresh":"false"}'
        ]);

        runs(function () {
            $.ajax({
                url: '/refresh',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect($.continuations.windowService.refresh).not.toHaveBeenCalled();
        });
    });
});

describe('Integrated navigate policy tests', function() {
    var server;
    var navigate;
    beforeEach(function() {
        server = sinon.fakeServer.create();
        navigate = $.continuations.windowService.navigateTo;
    });
    afterEach(function() {
        server.restore();
        $.continuations.windowService.navigateTo = navigate;
    });

    it('should navigate to url', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"navigatePage":"' + url + '"}'
        ]);

        runs(function () {
            $.ajax({
                url: '/navigate',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect($.continuations.windowService.navigateTo).toHaveBeenCalledWith(url);
        });
    });

    it('should not navigate to url when not specified', function () {
        var url = 'http://www.google.com';
        $.continuations.windowService.navigateTo = jasmine.createSpy('windowService.navigateTo');

        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"success": "true"}'
        ]);

        runs(function () {
            $.ajax({
                url: '/navigate',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect($.continuations.windowService.navigateTo).not.toHaveBeenCalled();
        });
    });
});

describe('Integrated error policy tests', function () {
    var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });

    it('should publish the ContinuationError topic when the continuation has errors', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"errors": [{"message": "Test"}]}'
        ]);

        var invoked = false;
        amplify.subscribe('ContinuationError', function (continuation) {
            invoked = continuation.errors.length == 1;
        });

        runs(function () {
            $.ajax({
                url: '/errors',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect(invoked).toEqual(true);
        });
    });

    it('should publish the ContinuationError topic when the continuation does not have errors', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"errors": []}'
        ]);

        var invoked = false;
        amplify.subscribe('ContinuationError', function (continuation) {
            invoked = true;
        });

        runs(function () {
            $.ajax({
                url: '/errors',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect(invoked).toEqual(false);
        });
    });
});

describe('Integrated payload policy tests', function () {
    var server;
    beforeEach(function () {
        server = sinon.fakeServer.create();
    });
    afterEach(function () {
        server.restore();
    });

    it('should publish the topic/payload when the continuation has a topic and payload', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"topic": "something", "payload": "else"}'
        ]);

        var invoked = false;
        amplify.subscribe('something', function (value) {
            invoked = value == "else";
        });

        runs(function () {
            $.ajax({
                url: '/payload',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect(invoked).toEqual(true);
        });
    });

    it('should not publish the topic/payload when the continuation does not have a topic and payload', function () {
        server.respondWith([200,
            { 'Content-Type': 'application/json' }, '{"success": "true"}'
        ]);

        var invoked = false;
        amplify.subscribe('something', function (value) {
            invoked = true;
        });

        runs(function () {
            $.ajax({
                url: '/payload',
                dataType: 'json',
                type: 'get'
            });
            server.respond();
        });

        waits(500);

        runs(function () {
            expect(invoked).toEqual(false);
        });
    });
});