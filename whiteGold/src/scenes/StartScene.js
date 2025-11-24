// -----------------------------------------------------------------------------
// StartScene.js: Tela de Início do "WhiteGold Saga"
// -----------------------------------------------------------------------------

import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {

  constructor() {
    super({ key: 'StartScene' });
  }

  // Inicializa variáveis
  init() {
    this.clouds = null;
  }

  create() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    //  FUNDO ANIMADO 
    this.createBackground();

    //  TÍTULO "WhiteGold Saga" 
    
    // WhiteGold (Dourado e Branco)
    this.add.text(centerX, centerY - 180, 'WhiteGold', {
      fontSize: '90px',
      fontFamily: 'Arial Black',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#FFFFFF', 
      strokeThickness: 4,
      shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5).setDepth(10);

    // Saga 
    this.add.text(centerX, centerY - 100, 'SAGA', {
      fontSize: '60px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000', 
      strokeThickness: 6,
      letterSpacing: 10 
    }).setOrigin(0.5).setDepth(10);


    //  CAIXA DE CONTROLES
    
    // Um retângulo semi-transparente para o fundo dos controles
    const boxY = centerY + 50;
    this.add.rectangle(centerX, boxY, 500, 180, 0x000000, 0.6)
        .setDepth(5);

    this.add.text(centerX, boxY - 60, 'CONTROLS', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#aaaaff'
    }).setOrigin(0.5).setDepth(10);

    // Ícones/Texto dos controles
    // Movimento
    this.add.text(centerX - 100, boxY, '⬆️⬇️⬅️➡️', { fontSize: '40px' }).setOrigin(0.5).setDepth(10);
    this.add.text(centerX + 50, boxY, 'MOVE / FLY', { fontSize: '24px', fontFamily: 'Arial' }).setOrigin(0, 0.5).setDepth(10);

    // Ataque
    this.add.text(centerX - 100, boxY + 50, '[ SPACE ]', { fontSize: '28px', fontFamily: 'Arial', color: '#FFD700' }).setOrigin(0.5).setDepth(10);
    this.add.text(centerX + 50, boxY + 50, 'ATTACK', { fontSize: '24px', fontFamily: 'Arial' }).setOrigin(0, 0.5).setDepth(10);


    //  MENSAGEM "PRESS SPACE TO PLAY"
    const startText = this.add.text(centerX, height - 80, 'PRESS SPACE TO PLAY', {
      fontSize: '32px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(10);

    // Faz o texto piscar
    this.tweens.add({
        targets: startText,
        alpha: 0,
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    // começar o Jogo
    this.input.keyboard.once('keydown-SPACE', () => {
        // Inicia a cena do jogo
        this.scene.start('GameScene');
    });
  }

  update() {
    // Lógica para reciclar as nuvens (mesma do jogo)
    this.clouds.children.iterate((cloud) => {
      if (cloud && cloud.x < -200) { 
        cloud.setActive(false);
        cloud.setVisible(false);
      }
    });
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fundo fixo
    this.add.image(width / 2, height / 2, 'bg1')
      .setDisplaySize(width, height)
      .setDepth(0);

    // Lua
    this.add.image(width - 100, 100, 'moon')
      .setScale(0.5)
      .setDepth(0);

    // Cria grupo de física para nuvens
    this.clouds = this.physics.add.group();
    
    // Cria algumas iniciais
    this.spawnCloud(width / 2);
    this.spawnCloud(width / 4);
    this.spawnCloud(width + 100);

    // Timer para criar mais nuvens
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnCloud,
      callbackScope: this,
      loop: true
    });
  }

  spawnCloud(xOffset) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Sorteia entre cloud1 e cloud4
    const cloudKey = 'cloud' + Phaser.Math.Between(1, 4);
    const startX = xOffset || (width + 150);
    const startY = Phaser.Math.Between(50, height / 2);

    let cloud = this.clouds.get(startX, startY, cloudKey);

    if (cloud) {
      cloud.setActive(true);
      cloud.setVisible(true);
      cloud.setTexture(cloudKey);
      cloud.setDepth(1); // Um pouco acima do fundo

      const scale = Phaser.Math.FloatBetween(0.5, 1.0);
      cloud.setScale(scale);
      cloud.setAlpha(0.9);

      // Física: move para a esquerda
      const speed = 50 * scale; 
      cloud.body.setVelocityX(-speed);
      cloud.body.setAllowGravity(false);
    }
  }
}