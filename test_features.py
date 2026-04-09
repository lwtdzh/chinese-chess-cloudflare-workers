#!/usr/bin/env python3
"""
Test script for Chinese Chess game features:
1. Surrender button
2. Draw request/response
3. Take back request/response
"""

import asyncio
import json
import time
import websocket

BASE_URL = "http://localhost:8080"
WS_URL = "ws://localhost:8080/ws-game"

def test_surrender():
    print("\n" + "=" * 50)
    print("TEST 1: Surrender Button")
    print("=" * 50)

    ws1 = websocket.WebSocket()
    ws2 = websocket.WebSocket()

    player1_id = f"player1_{int(time.time()*1000)}"
    player2_id = f"player2_{int(time.time()*1000)}"

    # Connect both players
    ws1.connect(WS_URL, header={"playerId": player1_id})
    ws2.connect(WS_URL, header={"playerId": player2_id})
    time.sleep(0.5)

    # Player 1 creates room
    ws1.send(json.dumps({"destination": "/app/createRoom", "body": json.dumps({"roomName": "SurrenderTest", "playerId": player1_id})}))
    time.sleep(0.5)

    # Player 2 joins
    ws2.send(json.dumps({"destination": "/app/joinRoom", "body": json.dumps({"roomId": "SurrenderTest", "playerId": player2_id})}))
    time.sleep(1)

    # Player 2 surrenders
    print("  Player 2 surrenders...")
    ws2.send(json.dumps({"destination": "/app/resign", "body": json.dumps({"roomId": "SurrenderTest", "playerId": player2_id})}))
    time.sleep(0.5)

    # Check for GAME_OVER message
    ws1.settimeout(2)
    try:
        while True:
            msg = ws1.recv()
            data = json.loads(msg)
            if "body" in data:
                body = json.loads(data["body"])
                if body.get("type") == "GAME_OVER":
                    if body.get("winner") == "RED" and body.get("reason") == "RESIGN":
                        print("  ✓ PASS: Surrender works correctly!")
                        print(f"    Winner: {body.get('winner')}, Reason: {body.get('reason')}")
                        break
    except:
        print("  ✗ FAIL: Did not receive correct GAME_OVER message")

    ws1.close()
    ws2.close()

def test_draw():
    print("\n" + "=" * 50)
    print("TEST 2: Draw Request/Response")
    print("=" * 50)

    ws1 = websocket.WebSocket()
    ws2 = websocket.WebSocket()

    player1_id = f"player1_{int(time.time()*1000)}"
    player2_id = f"player2_{int(time.time()*1000)}"

    ws1.connect(WS_URL, header={"playerId": player1_id})
    ws2.connect(WS_URL, header={"playerId": player2_id})
    time.sleep(0.5)

    ws1.send(json.dumps({"destination": "/app/createRoom", "body": json.dumps({"roomName": "DrawTest", "playerId": player1_id})}))
    time.sleep(0.5)
    ws2.send(json.dumps({"destination": "/app/joinRoom", "body": json.dumps({"roomId": "DrawTest", "playerId": player2_id})}))
    time.sleep(1)

    # Player 1 requests draw
    print("  Player 1 requests draw...")
    ws1.send(json.dumps({"destination": "/app/drawRequest", "body": json.dumps({"roomId": "DrawTest", "playerId": player1_id})}))
    time.sleep(0.5)

    # Player 2 receives and accepts
    ws2.settimeout(2)
    try:
        while True:
            msg = ws2.recv()
            data = json.loads(msg)
            if "body" in data:
                body = json.loads(data["body"])
                if body.get("type") == "DRAW_REQUEST":
                    print("  Player 2 received draw request, accepting...")
                    ws2.send(json.dumps({"destination": "/app/drawResponse", "body": json.dumps({"roomId": "DrawTest", "playerId": player2_id, "accepted": "true"})}))
                    time.sleep(0.5)
                    break
    except:
        print("  ✗ FAIL: Draw request not received")
        ws1.close()
        ws2.close()
        return

    # Check for GAME_OVER
    ws1.settimeout(2)
    try:
        while True:
            msg = ws1.recv()
            data = json.loads(msg)
            if "body" in data:
                body = json.loads(data["body"])
                if body.get("type") == "GAME_OVER" and body.get("winner") == "DRAW":
                    print("  ✓ PASS: Draw accepted! Game is a draw")
                    break
    except:
        print("  ✗ FAIL: GAME_OVER for draw not received")

    ws1.close()
    ws2.close()

def test_takeback():
    print("\n" + "=" * 50)
    print("TEST 3: Take Back Request/Response")
    print("=" * 50)

    ws1 = websocket.WebSocket()
    ws2 = websocket.WebSocket()

    player1_id = f"player1_{int(time.time()*1000)}"
    player2_id = f"player2_{int(time.time()*1000)}"

    ws1.connect(WS_URL, header={"playerId": player1_id})
    ws2.connect(WS_URL, header={"playerId": player2_id})
    time.sleep(0.5)

    ws1.send(json.dumps({"destination": "/app/createRoom", "body": json.dumps({"roomName": "TakeBackTest", "playerId": player1_id})}))
    time.sleep(0.5)
    ws2.send(json.dumps({"destination": "/app/joinRoom", "body": json.dumps({"roomId": "TakeBackTest", "playerId": player2_id})}))
    time.sleep(1)

    # Player 1 makes a move
    print("  Player 1 makes a move...")
    ws1.send(json.dumps({"destination": "/app/move", "body": json.dumps({"roomId": "TakeBackTest", "playerId": player1_id, "from": {"row": 6, "col": 0}, "to": {"row": 5, "col": 0}})}))
    time.sleep(0.5)

    # Player 1 requests take back
    print("  Player 1 requests take back...")
    ws1.send(json.dumps({"destination": "/app/takeBackRequest", "body": json.dumps({"roomId": "TakeBackTest", "playerId": player1_id})}))
    time.sleep(0.5)

    # Player 2 receives and accepts
    ws2.settimeout(2)
    try:
        while True:
            msg = ws2.recv()
            data = json.loads(msg)
            if "body" in data:
                body = json.loads(data["body"])
                if body.get("type") == "TAKE_BACK_REQUEST":
                    print("  Player 2 received take back request, accepting...")
                    ws2.send(json.dumps({"destination": "/app/takeBackResponse", "body": json.dumps({"roomId": "TakeBackTest", "playerId": player2_id, "accepted": "true"})}))
                    time.sleep(0.5)
                    break
    except:
        print("  ✗ FAIL: Take back request not received")
        ws1.close()
        ws2.close()
        return

    # Check for TAKE_BACK
    ws1.settimeout(2)
    try:
        while True:
            msg = ws1.recv()
            data = json.loads(msg)
            if "body" in data:
                body = json.loads(data["body"])
                if body.get("type") == "TAKE_BACK":
                    print("  ✓ PASS: Take back accepted! Move undone")
                    break
    except:
        print("  ✗ FAIL: TAKE_BACK message not received")

    ws1.close()
    ws2.close()

if __name__ == "__main__":
    print("Starting Chinese Chess Feature Tests...")
    time.sleep(2)  # Wait for server

    test_surrender()
    test_draw()
    test_takeback()

    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)