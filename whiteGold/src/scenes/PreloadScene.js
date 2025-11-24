// -----------------------------------------------------------------------------
// PreloadScene.js: configuração da cena responsável pelo carregamento dos
// objetos do jogo
// -----------------------------------------------------------------------------

import Phaser from 'phaser';

// -----------------------------------------------------------------------------

// Classe que define a cena de carregamento
export default class PreloadScene extends Phaser.Scene {


  // Construtor
  constructor() {
    super({ key: 'PreloadScene' });
  }

  // ---------------------------------------------------------------------------



  // Carrega os assets utilizados pelo jogo
  preload() {
    this.displayProgressBar();

    // --- CENÁRIO (Pasta background) ---
    this.load.image('bg1', 'assets/images/background/background.png');
    this.load.image('moon', 'assets/images/background/moon.png');

    // Nuvens
    this.load.image('cloud1', 'assets/images/background/clouds1.png');
    this.load.image('cloud2', 'assets/images/background/clouds2.png');
    this.load.image('cloud3', 'assets/images/background/clouds3.png');
    this.load.image('cloud4', 'assets/images/background/clouds4.png');

    // --- SPRITESHEETS ---

    // Player
    this.load.spritesheet('player', 'assets/images/spritesheets/personagemWhiteGold.png', {
      frameWidth: 624, frameHeight: 554
    });

    // Projétil do Player
    this.load.spritesheet('fireball', 'assets/images/spritesheets/fireArrow.png', {
      frameWidth: 540, frameHeight: 320
    });

    // Inimigo Comum: Morcego
    this.load.spritesheet('bat', 'assets/images/spritesheets/morcego.png', {
      frameWidth: 920, frameHeight: 650
    });

    // BOSS: Miner Demon
    this.load.spritesheet('boss', 'assets/images/spritesheets/minerDemon.png', {
      frameWidth: 920, frameHeight: 720
    });

    // Bola de Fogo do Boss Ataque 1
    this.load.spritesheet('enemy_fireball', 'assets/images/spritesheets/enemyFireBall.png', {
      frameWidth: 640, frameHeight: 500
    });

    // Meteoro / Ataque Ataque 2
    this.load.spritesheet('enemy_meteor', 'assets/images/spritesheets/enemyMeteor.png', {
      frameWidth: 300, frameHeight: 260
    });

    //coração de vida
    this.load.image('heart', 'assets/images/heart.png');

    // imagem do final do jogo(vitoria)
    this.load.image('princess', 'assets/images/princess.png');
  }

  // ---------------------------------------------------------------------------

  // Inicializa os elementos da cena
  create() {
    // Muda para a cena principal do jogo
    this.scene.start('StartScene');
  }

  // ---------------------------------------------------------------------------
  // Funções auxiliares
  // ---------------------------------------------------------------------------

  // Cria e exibe uma barra de progresso enquanto os assets são carregados
  displayProgressBar() {
    const { width, height } = this.cameras.main;
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 0.8);
    progressBarBg.fillRect(width / 4 - 2, height / 2 - 12, width / 2 + 4, 24);
    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 4, height / 2 - 10, (width / 2) * value, 20);
    });
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });
  }
}