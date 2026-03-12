{
  description = "Adam's dotfiles — nix-darwin + home-manager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    nix-darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nix-darwin, home-manager, ... }:
    let
      system = "aarch64-darwin";
      username = "adaminglehart";

      mkDarwinConfig = environment:
        nix-darwin.lib.darwinSystem {
          inherit system;
          specialArgs = { inherit environment username; };
          modules = [
            ./hosts/darwin.nix
            home-manager.darwinModules.home-manager
            {
              home-manager.useGlobalPkgs = true;
              home-manager.useUserPackages = true;
              home-manager.extraSpecialArgs = { inherit environment username; };
              home-manager.users.${username} = import ./home;
            }
          ];
        };
    in
    {
      darwinConfigurations = {
        home = mkDarwinConfig "home";
        work = mkDarwinConfig "work";
      };
    };
}
