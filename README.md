# Tetris

ブラウザで遊べるテトリスです。PC ではキーボード、スマホではタップボタンとスワイプで操作できます。

## Local Run

このフォルダで静的サーバーを立てて開きます。

```bash
cd "/Users/qitengyiming/Documents/New project"
python3 -m http.server 8000
```

ブラウザで以下を開きます。

- `http://localhost:8000/`

## Controls

- `←` / `→`: 移動
- `↓`: ソフトドロップ
- `↑` または `X`: 右回転
- `Z`: 左回転
- `Space`: ハードドロップ

スマホ操作:

- 画面下ボタン: 移動 / 回転 / ドロップ
- 盤面を左右スワイプ: 移動
- 盤面を下スワイプ: ソフトドロップ
- 盤面をタップ: 回転
- 盤面を上フリック: ハードドロップ

## GitHub Pages

1. GitHub で新しいリポジトリを作成
2. このフォルダを push

```bash
cd "/Users/qitengyiming/Documents/New project"
git init
git add .
git commit -m "Add browser Tetris"
git branch -M main
git remote add origin https://github.com/<username>/<repository>.git
git push -u origin main
```

3. GitHub の `Settings` → `Pages`
4. `Build and deployment` で `Deploy from a branch` を選択
5. `main` ブランチの `/ (root)` を公開対象に設定

公開 URL:

- `https://<username>.github.io/<repository>/`

## iPhone

iPhone の Safari で公開 URL を開き、共有メニューから「ホーム画面に追加」を選ぶとアプリ風に起動できます。
